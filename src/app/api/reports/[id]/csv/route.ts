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

    // Check subscription
    if (ctx.account.subscriptionTier === "NONE") {
      return errorResponse("Subscription required for CSV export", 403);
    }

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
    return handleApiError(error, "CSV export error");
  }
}
