import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext, handleApiError, hasLocationAccess, errorResponse } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        week: {
          include: {
            location: true,
            metrics: {
              include: { item: true },
              orderBy: [{ quadrant: "asc" }, { totalMargin: "desc" }],
            },
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

    const hasSubscription = ctx.account.subscriptionTier !== "NONE";

    const items = report.week.metrics.map((metric) => ({
      id: metric.id,
      itemId: metric.itemId,
      itemName: metric.item.name,
      category: metric.item.category,
      isAnchor: metric.item.isAnchor,
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
    }));

    // If no subscription, only show top 3 items
    const visibleItems = hasSubscription ? items : items.slice(0, 3);
    const lockedCount = hasSubscription ? 0 : items.length - 3;

    return NextResponse.json({
      id: report.id,
      weekId: report.weekId,
      weekStart: report.week.weekStart.toISOString(),
      weekEnd: report.week.weekEnd.toISOString(),
      locationName: report.week.location.name,
      generatedAt: report.generatedAt.toISOString(),
      summary: report.summary,
      items: visibleItems,
      lockedCount,
      hasSubscription,
    });
  } catch (error) {
    return handleApiError(error, "Report fetch error");
  }
}
