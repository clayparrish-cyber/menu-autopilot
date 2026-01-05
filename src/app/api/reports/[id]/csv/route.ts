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

    const account = await prisma.account.findUnique({
      where: { id: session.user.accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check subscription
    if (account.subscriptionTier === "NONE") {
      return NextResponse.json(
        { error: "Subscription required for CSV export" },
        { status: 403 }
      );
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

    // Build CSV
    const headers = [
      "Rank",
      "Item Name",
      "Category",
      "Quadrant",
      "Action",
      "Confidence",
      "Qty Sold",
      "Net Sales",
      "Avg Price",
      "Unit Cost",
      "Unit Margin",
      "Total Margin",
      "Food Cost %",
      "Suggested Price",
      "Price Change",
    ];

    const rows = report.week.metrics.map((metric, index) => {
      const suggestedPriceStr = metric.suggestedPrice
        ? `$${metric.suggestedPrice.toFixed(2)}`
        : "";
      const priceChangeStr = metric.priceChangeAmount
        ? `+$${metric.priceChangeAmount.toFixed(2)} (${metric.priceChangePct?.toFixed(1)}%)`
        : "";

      return [
        index + 1,
        `"${metric.item.name.replace(/"/g, '""')}"`,
        `"${(metric.item.category || "").replace(/"/g, '""')}"`,
        metric.quadrant,
        metric.recommendedAction,
        metric.confidence,
        metric.quantitySold,
        `$${metric.netSales.toFixed(2)}`,
        `$${metric.avgPrice.toFixed(2)}`,
        `$${metric.unitFoodCost.toFixed(2)}`,
        `$${metric.unitMargin.toFixed(2)}`,
        `$${metric.totalMargin.toFixed(2)}`,
        `${metric.foodCostPct.toFixed(1)}%`,
        suggestedPriceStr,
        priceChangeStr,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    const weekStart = report.week.weekStart.toISOString().split("T")[0];
    const weekEnd = report.week.weekEnd.toISOString().split("T")[0];
    const filename = `menu-autopilot-${report.week.location.name.replace(/\s+/g, "-")}-${weekStart}-to-${weekEnd}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
