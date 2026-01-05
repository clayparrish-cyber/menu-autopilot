import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check subscription tier
    const account = await prisma.account.findUnique({
      where: { id: session.user.accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        week: {
          include: {
            location: true,
            metrics: {
              include: {
                item: true,
              },
              orderBy: [
                { quadrant: "asc" },
                { totalMargin: "desc" },
              ],
            },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check location belongs to account
    const accountLocations = await prisma.location.findMany({
      where: { accountId: session.user.accountId },
      select: { id: true },
    });

    const locationIds = accountLocations.map((l) => l.id);
    if (!locationIds.includes(report.week.locationId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check paywall - if no subscription, return limited data
    const hasSubscription = account.subscriptionTier !== "NONE";

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

    // If no subscription, only show top 3 items and blur the rest
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
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
