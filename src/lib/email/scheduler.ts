// lib/email/scheduler.ts
// Handles scheduled automatic email sending

import { prisma } from "@/lib/db";
import { sendReportEmail, getAccountMembers } from "./service";
import { generateWeeklyReportPayload, getPriorWeekSnapshot, transformMetricsToItems } from "@/lib/report";
import { generateScoringResult } from "@/lib/scoring/engine";

interface SchedulerResult {
  accountsProcessed: number;
  emailsSent: number;
  errors: string[];
}

/**
 * Process scheduled emails for the current hour
 * Called by cron job every hour
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
    const accounts = await prisma.account.findMany({
      where: {
        emailScheduleEnabled: true,
        emailScheduleDay: currentDay,
        emailScheduleHour: currentHour,
        subscriptionTier: { not: "NONE" },
      },
      include: {
        locations: { select: { id: true } },
      },
    });

    for (const account of accounts) {
      result.accountsProcessed++;

      try {
        const report = await prisma.report.findFirst({
          where: {
            week: { locationId: { in: account.locations.map((l) => l.id) } },
            emailSentAt: null,
          },
          orderBy: { generatedAt: "desc" },
          include: {
            week: {
              include: {
                location: { include: { account: true } },
                metrics: { include: { item: true } },
              },
            },
          },
        });

        if (!report) continue;

        const members = await getAccountMembers(account.id);
        if (members.length === 0) {
          result.errors.push(`Account ${account.id}: No members found`);
          continue;
        }

        const items = transformMetricsToItems(report.week.metrics);
        const scoringResult = generateScoringResult(items);
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const priorWeekSummary = await getPriorWeekSnapshot(report.week.locationId, report.week.weekStart);

        const payload = generateWeeklyReportPayload({
          reportId: report.id,
          accountName: report.week.location.account.name,
          locationName: report.week.location.name,
          weekStart: report.week.weekStart,
          weekEnd: report.week.weekEnd,
          scoringResult,
          baseUrl,
          targetFoodCostPct: account.targetFoodCostPct,
          channel: report.week.location.channel,
          priorWeekSummary,
        });

        const sendResult = await sendReportEmail(
          report.id,
          members.map((m) => m.email),
          account.ownerId || "system",
          account.id,
          payload
        );

        if (sendResult.success) {
          result.emailsSent++;
        } else {
          result.errors.push(`Account ${account.id}: ${sendResult.error}`);
        }
      } catch (err) {
        result.errors.push(`Account ${account.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  } catch (err) {
    result.errors.push(`Scheduler error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  return result;
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
