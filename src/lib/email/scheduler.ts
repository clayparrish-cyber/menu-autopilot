// lib/email/scheduler.ts
// Handles scheduled automatic email sending

import { prisma } from "@/lib/db";
import { sendReportEmail, getAccountMembers } from "./service";
import { generateWeeklyReportPayload, getPriorWeekSnapshot } from "@/lib/report";
import { generateScoringResult } from "@/lib/scoring/engine";
import type { ItemMetrics } from "@/lib/scoring/engine";

interface SchedulerResult {
  accountsProcessed: number;
  emailsSent: number;
  errors: string[];
}

/**
 * Process scheduled emails for the current hour
 * Should be called by a cron job every hour
 */
export async function processScheduledEmails(): Promise<SchedulerResult> {
  const now = new Date();
  const currentDay = now.getDay() || 7; // Convert Sunday from 0 to 7
  const currentHour = now.getHours();

  const result: SchedulerResult = {
    accountsProcessed: 0,
    emailsSent: 0,
    errors: [],
  };

  try {
    // Find accounts where scheduling is enabled and matches current day/hour
    const accounts = await prisma.account.findMany({
      where: {
        emailScheduleEnabled: true,
        emailScheduleDay: currentDay,
        emailScheduleHour: currentHour,
        subscriptionTier: { not: "NONE" }, // Only active subscribers
      },
      include: {
        locations: {
          select: { id: true },
        },
      },
    });

    for (const account of accounts) {
      result.accountsProcessed++;

      try {
        // Find the most recent report across all account locations that hasn't been emailed
        const report = await prisma.report.findFirst({
          where: {
            week: {
              locationId: { in: account.locations.map((l) => l.id) },
            },
            emailSentAt: null, // Not yet emailed
          },
          orderBy: {
            generatedAt: "desc",
          },
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
          // No unsent reports for this account
          continue;
        }

        // Get all account members as recipients
        const members = await getAccountMembers(account.id);
        if (members.length === 0) {
          result.errors.push(`Account ${account.id}: No members found`);
          continue;
        }

        const recipientEmails = members.map((m) => m.email);

        // Generate the report payload
        const payload = await generateReportPayload(report, account.targetFoodCostPct);

        if (!payload) {
          result.errors.push(`Account ${account.id}: Failed to generate report payload`);
          continue;
        }

        // Send the email (this also handles rate limiting and logging)
        const sendResult = await sendReportEmail(
          report.id,
          recipientEmails,
          account.ownerId || "system", // Use owner as sender, or "system" if no owner
          account.id,
          payload
        );

        if (sendResult.success) {
          result.emailsSent++;
        } else {
          result.errors.push(`Account ${account.id}: ${sendResult.error}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors.push(`Account ${account.id}: ${message}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(`Scheduler error: ${message}`);
  }

  return result;
}

/**
 * Generate report payload from database report
 */
async function generateReportPayload(
  report: {
    id: string;
    week: {
      weekStart: Date;
      weekEnd: Date;
      locationId: string;
      location: {
        name: string;
        channel: any;
        account: { name: string };
      };
      metrics: Array<{
        itemId: string;
        item: { name: string; category: string | null; isAnchor: boolean };
        quantitySold: number;
        netSales: number;
        unitFoodCost: number;
        unitCostBase: number | null;
        unitCostModifiers: number | null;
        costSource: string;
        avgPrice: number;
        unitMargin: number;
        totalMargin: number;
        foodCostPct: number;
        popularityPercentile: number;
        marginPercentile: number;
        profitPercentile: number;
        quadrant: string;
        recommendedAction: string;
        suggestedPrice: number | null;
        priceChangeAmount: number | null;
        priceChangePct: number | null;
        confidence: string;
        explanation: any;
      }>;
    };
  },
  targetFoodCostPct: number
) {
  // Transform database metrics to ItemMetrics format
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
      explanation: Array.isArray(metric.explanation) ? (metric.explanation as string[]) : [],
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

  return generateWeeklyReportPayload({
    reportId: report.id,
    accountName: report.week.location.account.name,
    locationName: report.week.location.name,
    weekStart: report.week.weekStart,
    weekEnd: report.week.weekEnd,
    scoringResult,
    baseUrl,
    targetFoodCostPct,
    channel: report.week.location.channel,
    priorWeekSummary,
  });
}

/**
 * Get accounts due for scheduled emails (for monitoring/debugging)
 */
export async function getAccountsDueForEmail(day: number, hour: number) {
  return prisma.account.findMany({
    where: {
      emailScheduleEnabled: true,
      emailScheduleDay: day,
      emailScheduleHour: hour,
      subscriptionTier: { not: "NONE" },
    },
    select: {
      id: true,
      name: true,
      emailScheduleDay: true,
      emailScheduleHour: true,
    },
  });
}
