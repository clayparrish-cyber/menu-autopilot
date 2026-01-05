import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext, handleApiError, errorResponse } from "@/lib/api";
import { z } from "zod";
import { scoreItems, generateScoringResult, ItemInput } from "@/lib/scoring";
import { CanonicalField } from "@/lib/mapping";
import { Prisma } from "@prisma/client";

const uploadSchema = z.object({
  performanceData: z.object({
    rows: z.array(z.record(z.string(), z.string())),
    mapping: z.record(z.string(), z.string().nullable()),
  }),
  costData: z
    .object({
      rows: z.array(z.record(z.string(), z.string())),
      mapping: z.record(z.string(), z.string().nullable()),
    })
    .nullable(),
  weekStart: z.string(),
  weekEnd: z.string(),
  preset: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const body = await req.json();
    const data = uploadSchema.parse(body);

    if (ctx.locationIds.length === 0) {
      return errorResponse("No location found. Please complete onboarding.", 400);
    }

    // Get full account with locations for processing
    const account = await prisma.account.findUnique({
      where: { id: ctx.account.id },
      include: { locations: true },
    });

    if (!account) {
      return errorResponse("Account not found", 404);
    }

    const location = account.locations[0];

    // Parse dates
    const weekStart = new Date(data.weekStart);
    const weekEnd = new Date(data.weekEnd);

    // Create reverse mapping (field -> header)
    const perfFieldToHeader = new Map<CanonicalField, string>();
    for (const [header, field] of Object.entries(data.performanceData.mapping)) {
      if (field) {
        perfFieldToHeader.set(field as CanonicalField, header);
      }
    }

    // Build cost lookup from cost data or existing overrides
    const costLookup = new Map<string, number>();

    if (data.costData) {
      const costFieldToHeader = new Map<CanonicalField, string>();
      for (const [header, field] of Object.entries(data.costData.mapping)) {
        if (field) {
          costFieldToHeader.set(field as CanonicalField, header);
        }
      }

      const itemNameHeader = costFieldToHeader.get("item_name");
      const costHeader = costFieldToHeader.get("net_sales"); // Using net_sales field for cost

      if (itemNameHeader && costHeader) {
        for (const row of data.costData.rows) {
          const itemName = row[itemNameHeader]?.trim();
          const cost = parseFloat(row[costHeader]) || 0;
          if (itemName && cost > 0) {
            costLookup.set(itemName.toLowerCase(), cost);
          }
        }
      }
    }

    // If no cost data provided, fetch existing costs from database
    if (costLookup.size === 0) {
      const existingItems = await prisma.item.findMany({
        where: { locationId: location.id },
        include: {
          costOverrides: {
            orderBy: { effectiveDate: "desc" },
            take: 1,
          },
        },
      });

      for (const item of existingItems) {
        if (item.costOverrides.length > 0) {
          costLookup.set(item.name.toLowerCase(), item.costOverrides[0].unitFoodCost);
        }
      }
    }

    // Process performance data
    const itemNameHeader = perfFieldToHeader.get("item_name");
    const qtyHeader = perfFieldToHeader.get("quantity_sold");
    const salesHeader = perfFieldToHeader.get("net_sales");
    const categoryHeader = perfFieldToHeader.get("category");

    if (!itemNameHeader || !qtyHeader || !salesHeader) {
      return NextResponse.json(
        { error: "Missing required column mappings" },
        { status: 400 }
      );
    }

    // Aggregate items (handling duplicates by category+name)
    const itemAggregates = new Map<
      string,
      {
        name: string;
        category: string | null;
        qty: number;
        sales: number;
      }
    >();

    for (const row of data.performanceData.rows) {
      const name = row[itemNameHeader]?.trim();
      const qty = parseFloat(row[qtyHeader]) || 0;
      const sales = parseFloat(row[salesHeader]) || 0;
      const category = categoryHeader ? row[categoryHeader]?.trim() || null : null;

      if (!name) continue;

      // Skip negative values (adjustments/refunds)
      if (qty < 0 || sales < 0) continue;

      const key = category ? `${category}::${name}` : name;

      const existing = itemAggregates.get(key);
      if (existing) {
        existing.qty += qty;
        existing.sales += sales;
      } else {
        itemAggregates.set(key, { name, category, qty, sales });
      }
    }

    // Create or update week
    const week = await prisma.week.upsert({
      where: {
        locationId_weekStart_weekEnd: {
          locationId: location.id,
          weekStart,
          weekEnd,
        },
      },
      update: {},
      create: {
        locationId: location.id,
        weekStart,
        weekEnd,
      },
    });

    // Create upload record
    await prisma.upload.create({
      data: {
        filename: "performance.csv",
        fileType: "PERFORMANCE",
        rowCount: data.performanceData.rows.length,
        status: "COMPLETED",
        columnMapping: data.performanceData.mapping as Prisma.InputJsonValue,
        locationId: location.id,
        weekId: week.id,
      },
    });

    // Process items and create/update in database
    const itemInputs: ItemInput[] = [];

    for (const [, agg] of itemAggregates) {
      // Upsert item
      const item = await prisma.item.upsert({
        where: {
          locationId_name: {
            locationId: location.id,
            name: agg.name,
          },
        },
        update: { category: agg.category },
        create: {
          name: agg.name,
          category: agg.category,
          locationId: location.id,
        },
      });

      // Get cost
      let unitCost = costLookup.get(agg.name.toLowerCase()) || 0;

      // If cost data was provided, update the cost override
      if (data.costData && unitCost > 0) {
        await prisma.costOverride.create({
          data: {
            itemId: item.id,
            unitFoodCost: unitCost,
            effectiveDate: weekStart,
          },
        });
      }

      // If no cost found, use a default (30% of avg price as estimate)
      if (unitCost === 0 && agg.qty > 0) {
        unitCost = (agg.sales / agg.qty) * 0.3;
      }

      itemInputs.push({
        itemId: item.id,
        itemName: item.name,
        category: agg.category || undefined,
        quantitySold: agg.qty,
        netSales: agg.sales,
        unitFoodCost: unitCost,
        isAnchor: item.isAnchor,
      });
    }

    // Run scoring engine
    const scoredItems = scoreItems(itemInputs, {
      targetFoodCostPct: account.targetFoodCostPct,
      minQtyThreshold: account.minQtyThreshold,
      popularityThreshold: account.popularityThreshold,
      marginThreshold: account.marginThreshold,
      allowPremiumPricing: account.allowPremiumPricing,
    });

    const result = generateScoringResult(scoredItems);

    // Delete existing metrics for this week
    await prisma.itemWeekMetric.deleteMany({
      where: { weekId: week.id },
    });

    // Save metrics to database
    for (const metric of scoredItems) {
      await prisma.itemWeekMetric.create({
        data: {
          itemId: metric.itemId,
          weekId: week.id,
          quantitySold: metric.quantitySold,
          netSales: metric.netSales,
          avgPrice: metric.avgPrice,
          unitFoodCost: metric.unitFoodCost,
          unitMargin: metric.unitMargin,
          totalMargin: metric.totalMargin,
          foodCostPct: metric.foodCostPct,
          popularityPercentile: metric.popularityPercentile,
          marginPercentile: metric.marginPercentile,
          profitPercentile: metric.profitPercentile,
          quadrant: metric.quadrant,
          recommendedAction: metric.recommendedAction,
          suggestedPrice: metric.suggestedPrice,
          priceChangeAmount: metric.priceChangeAmount,
          priceChangePct: metric.priceChangePct,
          confidence: metric.confidence,
          explanation: metric.explanation,
        },
      });
    }

    // Create summary for storing (without complex objects)
    const storedSummary = {
      totalItems: result.summary.totalItems,
      stars: result.summary.stars,
      plowhorses: result.summary.plowhorses,
      puzzles: result.summary.puzzles,
      dogs: result.summary.dogs,
      totalRevenue: result.summary.totalRevenue,
      totalMargin: result.summary.totalMargin,
      avgFoodCostPct: result.summary.avgFoodCostPct,
    };

    // Create or update report
    const report = await prisma.report.upsert({
      where: { weekId: week.id },
      update: {
        summary: storedSummary,
        generatedAt: new Date(),
      },
      create: {
        weekId: week.id,
        summary: storedSummary,
        generatedAt: new Date(),
      },
    });

    // Save column mapping to account for future use
    const columnMappings = {
      performance: data.performanceData.mapping,
      cost: data.costData?.mapping || null,
      preset: data.preset || null,
    };

    await prisma.account.update({
      where: { id: account.id },
      data: {
        columnMappings: columnMappings as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      weekId: week.id,
      itemCount: scoredItems.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return handleApiError(error, "Upload error");
  }
}
