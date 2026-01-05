import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext, handleApiError, hasLocationAccess, errorResponse } from "@/lib/api";
import { generateWeeklyReportPayload, getPriorWeekSnapshot, findRecentWins, transformMetricsToItems } from "@/lib/report";
import { generateScoringResult } from "@/lib/scoring/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const { id } = await params;

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

    const items = transformMetricsToItems(report.week.metrics);
    const scoringResult = generateScoringResult(items);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const [priorWeekSummary, recentWins] = await Promise.all([
      getPriorWeekSnapshot(report.week.locationId, report.week.weekStart),
      findRecentWins(report.week.locationId, report.week.weekStart, scoringResult.items),
    ]);

    const payload = generateWeeklyReportPayload({
      reportId: report.id,
      accountName: report.week.location.account.name,
      locationName: report.week.location.name,
      weekStart: report.week.weekStart,
      weekEnd: report.week.weekEnd,
      scoringResult,
      baseUrl,
      targetFoodCostPct: ctx.account.targetFoodCostPct || 30,
      channel: report.week.location.channel,
      priorWeekSummary,
      recentWins,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, "Full report fetch error");
  }
}
