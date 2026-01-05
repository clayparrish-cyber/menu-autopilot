// lib/report/snapshot.ts
import { prisma } from "../db";
import { Prisma } from "@prisma/client";
import type { WeekSummaryTotals } from "./types";
import type { ScoringResult } from "../scoring/engine";

/**
 * Compute WeekSummaryTotals from scoring result
 */
export function computeWeekSummary(scoringResult: ScoringResult): WeekSummaryTotals {
  const items = scoringResult.items;

  const revenue = items.reduce((sum, item) => sum + item.netSales, 0);
  const grossMargin = items.reduce((sum, item) => sum + item.totalMargin, 0);
  const itemsSold = items.reduce((sum, item) => sum + item.quantitySold, 0);
  const marginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0;

  return {
    revenue: Math.round(revenue * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    itemsSold,
    marginPct: Math.round(marginPct * 10) / 10,
  };
}

/**
 * Save week snapshot to database
 */
export async function saveWeekSnapshot(
  locationId: string,
  weekStart: Date,
  weekEnd: Date,
  summary: WeekSummaryTotals,
  categoryBreakdown?: Record<string, { revenue: number; margin: number; qty: number }>
): Promise<void> {
  const jsonBreakdown: Prisma.InputJsonValue | undefined = categoryBreakdown
    ? (categoryBreakdown as Prisma.InputJsonValue)
    : undefined;

  await prisma.weekSnapshot.upsert({
    where: {
      locationId_weekStart_weekEnd: {
        locationId,
        weekStart,
        weekEnd,
      },
    },
    update: {
      revenue: summary.revenue,
      grossMargin: summary.grossMargin,
      itemsSold: summary.itemsSold,
      marginPct: summary.marginPct ?? 0,
      categoryBreakdown: jsonBreakdown,
    },
    create: {
      locationId,
      weekStart,
      weekEnd,
      revenue: summary.revenue,
      grossMargin: summary.grossMargin,
      itemsSold: summary.itemsSold,
      marginPct: summary.marginPct ?? 0,
      categoryBreakdown: jsonBreakdown,
    },
  });
}

/**
 * Get the prior week's snapshot for WoW comparison
 * Returns null if no prior week data exists
 */
export async function getPriorWeekSnapshot(
  locationId: string,
  currentWeekStart: Date
): Promise<WeekSummaryTotals | null> {
  // Calculate prior week dates (7 days before current week)
  const priorWeekEnd = new Date(currentWeekStart);
  priorWeekEnd.setDate(priorWeekEnd.getDate() - 1); // Day before current week start

  const priorWeekStart = new Date(priorWeekEnd);
  priorWeekStart.setDate(priorWeekStart.getDate() - 6); // 7 days total

  // Try to find exact match first
  let snapshot = await prisma.weekSnapshot.findUnique({
    where: {
      locationId_weekStart_weekEnd: {
        locationId,
        weekStart: priorWeekStart,
        weekEnd: priorWeekEnd,
      },
    },
  });

  // If no exact match, try finding most recent snapshot before current week
  if (!snapshot) {
    snapshot = await prisma.weekSnapshot.findFirst({
      where: {
        locationId,
        weekEnd: { lt: currentWeekStart },
      },
      orderBy: { weekEnd: "desc" },
    });
  }

  if (!snapshot) return null;

  return {
    revenue: snapshot.revenue,
    grossMargin: snapshot.grossMargin,
    itemsSold: snapshot.itemsSold,
    marginPct: snapshot.marginPct,
  };
}
