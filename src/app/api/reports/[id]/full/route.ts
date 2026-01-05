import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateWeeklyReportPayload } from "@/lib/report";
import type { ItemMetrics, ScoringResult } from "@/lib/scoring/engine";

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

    const account = await prisma.account.findUnique({
      where: { id: session.user.accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check subscription - full report requires subscription
    if (account.subscriptionTier === "NONE") {
      return NextResponse.json(
        { error: "Subscription required for full report" },
        { status: 403 }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        week: {
          include: {
            location: {
              include: {
                account: true,
              },
            },
            metrics: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check location belongs to account
    if (report.week.location.accountId !== session.user.accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Transform database metrics to ItemMetrics format
    const items: ItemMetrics[] = report.week.metrics.map((metric) => ({
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
      explanation: Array.isArray(metric.explanation)
        ? (metric.explanation as string[])
        : [],
      estimatedImpact: 0, // Will be recalculated
    }));

    // Sort by estimated impact for top actions
    items.sort((a, b) => {
      if (a.recommendedAction === "REPRICE" && a.priceChangeAmount) {
        a.estimatedImpact = a.priceChangeAmount * a.quantitySold;
      }
      if (b.recommendedAction === "REPRICE" && b.priceChangeAmount) {
        b.estimatedImpact = b.priceChangeAmount * b.quantitySold;
      }
      return b.estimatedImpact - a.estimatedImpact;
    });

    // Build scoring result structure
    const scoringResult: ScoringResult = {
      items,
      summary: {
        totalItems: items.length,
        stars: items.filter((i) => i.quadrant === "STAR").length,
        plowhorses: items.filter((i) => i.quadrant === "PLOWHORSE").length,
        puzzles: items.filter((i) => i.quadrant === "PUZZLE").length,
        dogs: items.filter((i) => i.quadrant === "DOG").length,
        totalRevenue: items.reduce((sum, i) => sum + i.netSales, 0),
        totalMargin: items.reduce((sum, i) => sum + i.totalMargin, 0),
        avgFoodCostPct:
          items.length > 0
            ? items.reduce((sum, i) => sum + i.foodCostPct, 0) / items.length
            : 0,
        topActions: items.slice(0, 10),
        marginLeaks: items
          .filter((i) => i.quadrant === "PLOWHORSE")
          .sort((a, b) => b.quantitySold - a.quantitySold)
          .slice(0, 3),
        easyWins: items
          .filter(
            (i) =>
              i.quadrant === "PUZZLE" &&
              (i.confidence === "HIGH" || i.confidence === "MEDIUM")
          )
          .sort((a, b) => b.unitMargin - a.unitMargin)
          .slice(0, 3),
        watchItems: items.filter((i) => i.confidence === "LOW").slice(0, 3),
      },
    };

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Generate the full report payload
    const payload = generateWeeklyReportPayload({
      reportId: report.id,
      accountName: report.week.location.account.name,
      locationName: report.week.location.name,
      weekStart: report.week.weekStart,
      weekEnd: report.week.weekEnd,
      scoringResult,
      baseUrl,
      targetFoodCostPct: account.targetFoodCostPct,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Full report fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
