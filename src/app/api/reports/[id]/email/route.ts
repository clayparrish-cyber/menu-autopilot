// POST /api/reports/[id]/email - Send report email to multiple recipients
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext, handleApiError, hasLocationAccess, errorResponse } from "@/lib/api";
import { sendEmailSchema } from "@/lib/email/schema";
import { verifyRecipientsAreAccountMembers, sendReportEmail } from "@/lib/email/service";
import { generateWeeklyReportPayload, getPriorWeekSnapshot, findRecentWins, transformMetricsToItems } from "@/lib/report";
import { generateScoringResult } from "@/lib/scoring/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const { id: reportId } = await params;

    const body = await req.json();
    const parsed = sendEmailSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid input", 400);
    }

    if (ctx.account.subscriptionTier === "NONE") {
      return errorResponse("Active subscription required to send report emails", 403);
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
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

    const recipientCheck = await verifyRecipientsAreAccountMembers(
      ctx.accountId,
      parsed.data.recipientIds
    );

    if (!recipientCheck.valid) {
      return errorResponse(`Invalid recipient IDs: ${recipientCheck.invalidIds.join(", ")}`, 400);
    }

    if (recipientCheck.emails.length === 0) {
      return errorResponse("No valid recipients found", 400);
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

    const result = await sendReportEmail(
      reportId,
      recipientCheck.emails,
      ctx.userId,
      ctx.accountId,
      payload
    );

    if (!result.success) {
      return errorResponse(result.error || "Failed to send email", 429);
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      recipientCount: recipientCheck.emails.length,
    });
  } catch (error) {
    return handleApiError(error, "Email send error");
  }
}
