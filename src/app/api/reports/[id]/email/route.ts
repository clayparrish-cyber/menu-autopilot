// POST /api/reports/[id]/email - Send report email to multiple recipients
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getAuthContext,
  handleApiError,
  hasLocationAccess,
  errorResponse,
} from "@/lib/api";
import { sendEmailSchema } from "@/lib/email/schema";
import {
  verifyRecipientsAreAccountMembers,
  sendReportEmail,
} from "@/lib/email/service";
import { generateWeeklyReportPayload, getPriorWeekSnapshot } from "@/lib/report";
import { generateScoringResult } from "@/lib/scoring/engine";
import type { ItemMetrics } from "@/lib/scoring/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const { id: reportId } = await params;

    // 1. Parse and validate request body
    const body = await req.json();
    const parsed = sendEmailSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid input", 400);
    }

    const { recipientIds } = parsed.data;

    // 2. Verify subscription (require active subscription to send emails)
    if (ctx.account.subscriptionTier === "NONE") {
      return errorResponse(
        "Active subscription required to send report emails",
        403
      );
    }

    // 3. Fetch report with week, location, account, and metrics
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

    // 4. Verify user has access to this report's location
    if (!hasLocationAccess(ctx, report.week.locationId)) {
      return errorResponse("Unauthorized", 403);
    }

    // 5. Verify all recipients are account members
    const recipientCheck = await verifyRecipientsAreAccountMembers(
      ctx.accountId,
      recipientIds
    );

    if (!recipientCheck.valid) {
      return errorResponse(
        `Invalid recipient IDs: ${recipientCheck.invalidIds.join(", ")}`,
        400
      );
    }

    if (recipientCheck.emails.length === 0) {
      return errorResponse("No valid recipients found", 400);
    }

    // 6. Transform database metrics to ItemMetrics format
    const items: ItemMetrics[] = report.week.metrics.map((metric) => {
      const item: ItemMetrics = {
        itemId: metric.itemId,
        itemName: metric.item.name,
        category: metric.item.category || undefined,
        quantitySold: metric.quantitySold,
        netSales: metric.netSales,
        unitFoodCost: metric.unitFoodCost,
        unitCostBase: metric.unitCostBase ?? undefined,
        unitCostModifiers: metric.unitCostModifiers ?? undefined,
        costSource: metric.costSource as ItemMetrics["costSource"],
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

    // Generate scoring result
    const scoringResult = generateScoringResult(items);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Get prior week summary for WoW comparison
    const priorWeekSummary = await getPriorWeekSnapshot(
      report.week.locationId,
      report.week.weekStart
    );

    // 7. Generate the report payload for email
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
    });

    // 8. Send the email (rate limits checked inside)
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
