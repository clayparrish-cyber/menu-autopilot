import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext, handleApiError, hasLocationAccess, errorResponse } from "@/lib/api";
import { generateWeeklyReportPayload } from "@/lib/report";
import { generateScoringResult } from "@/lib/scoring/engine";
import type { ItemMetrics } from "@/lib/scoring/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const { id } = await params;

    // Check subscription - full report requires subscription
    if (ctx.account.subscriptionTier === "NONE") {
      return errorResponse("Subscription required for full report", 403);
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        week: {
          include: {
            location: { include: { account: true } },
            metrics: { include: { item: true } },
          },
        },
      },
    });

    if (!report) {
      return errorResponse("Report not found", 404);
    }

    if (!hasLocationAccess(ctx, report.week.locationId)) {
      return errorResponse("Unauthorized", 403);
    }

    // Transform database metrics to ItemMetrics format
    const items: ItemMetrics[] = report.week.metrics.map((metric) => {
      const item: ItemMetrics = {
        itemId: metric.itemId,
        itemName: metric.item.name,
        category: metric.item.category || undefined,
        quantitySold: metric.quantitySold,
        netSales: metric.netSales,
        unitFoodCost: metric.unitFoodCost,
        isAnchor: metric.item.isAnchor,
        avgPrice: metric.avgPrice,
        unitMargin: metric.unitMargin,
        totalMargin: metric.totalMargin,
        foodCostPct: metric.foodCostPct,
        popularityPercentile: metric.popularityPercentile,
        marginPercentile: metric.marginPercentile,
        profitPercentile: metric.profitPercentile,
        quadrant: metric.quadrant as ItemMetrics["quadrant"],
        recommendedAction: metric.recommendedAction as ItemMetrics["recommendedAction"],
        suggestedPrice: metric.suggestedPrice,
        priceChangeAmount: metric.priceChangeAmount,
        priceChangePct: metric.priceChangePct,
        confidence: metric.confidence as ItemMetrics["confidence"],
        explanation: Array.isArray(metric.explanation) ? metric.explanation as string[] : [],
        estimatedImpact: 0,
      };

      // Calculate estimated impact
      if (item.recommendedAction === "REPRICE" && item.priceChangeAmount) {
        item.estimatedImpact = item.priceChangeAmount * item.quantitySold;
      } else if (item.recommendedAction === "REMOVE") {
        item.estimatedImpact = Math.abs(item.totalMargin);
      } else if (item.recommendedAction === "REPOSITION") {
        item.estimatedImpact = item.totalMargin;
      }

      return item;
    });

    // Sort by estimated impact
    items.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

    // Use existing scoring result generator to avoid duplication
    const scoringResult = generateScoringResult(items);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const payload = generateWeeklyReportPayload({
      reportId: report.id,
      accountName: report.week.location.account.name,
      locationName: report.week.location.name,
      weekStart: report.week.weekStart,
      weekEnd: report.week.weekEnd,
      scoringResult,
      baseUrl,
      targetFoodCostPct: ctx.account.targetFoodCostPct || 30,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, "Full report fetch error");
  }
}
