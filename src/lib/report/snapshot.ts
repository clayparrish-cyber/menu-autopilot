// lib/report/snapshot.ts
import { prisma } from "../db";
import { Prisma } from "@prisma/client";
import type { WeekSummaryTotals, RecentWin } from "./types";
import type { ScoringResult, ItemMetrics } from "../scoring/engine";

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

/**
 * Find items that improved vs their 4-week average
 * Returns ranked list of recent wins (biggest improvements first)
 */
export async function findRecentWins(
  locationId: string,
  currentWeekStart: Date,
  currentItems: ItemMetrics[]
): Promise<RecentWin[]> {
  // Get weeks from the prior 4 weeks (not including current week)
  const fourWeeksAgo = new Date(currentWeekStart);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const priorWeeks = await prisma.week.findMany({
    where: {
      locationId,
      weekStart: {
        gte: fourWeeksAgo,
        lt: currentWeekStart,
      },
    },
    include: {
      metrics: {
        include: { item: true },
      },
    },
    orderBy: { weekStart: "desc" },
    take: 4,
  });

  if (priorWeeks.length === 0) {
    return [];
  }

  // Build 4-week averages by item name
  const itemAverages: Map<string, {
    avgMarginPct: number;
    avgMarginDollars: number;
    avgRevenue: number;
    avgQty: number;
    weeksPresent: number;
    category?: string;
  }> = new Map();

  for (const week of priorWeeks) {
    for (const metric of week.metrics) {
      const itemName = metric.item.name;
      const existing = itemAverages.get(itemName);

      if (existing) {
        existing.avgMarginPct += metric.foodCostPct ? (1 - metric.foodCostPct) * 100 : 0;
        existing.avgMarginDollars += metric.unitMargin;
        existing.avgRevenue += metric.netSales;
        existing.avgQty += metric.quantitySold;
        existing.weeksPresent += 1;
      } else {
        itemAverages.set(itemName, {
          avgMarginPct: metric.foodCostPct ? (1 - metric.foodCostPct) * 100 : 0,
          avgMarginDollars: metric.unitMargin,
          avgRevenue: metric.netSales,
          avgQty: metric.quantitySold,
          weeksPresent: 1,
          category: metric.item.category || undefined,
        });
      }
    }
  }

  // Calculate actual averages
  for (const [, data] of itemAverages) {
    data.avgMarginPct /= data.weeksPresent;
    data.avgMarginDollars /= data.weeksPresent;
    data.avgRevenue /= data.weeksPresent;
    data.avgQty /= data.weeksPresent;
  }

  // Compare current week to averages and find improvements
  const wins: RecentWin[] = [];

  for (const item of currentItems) {
    const avgData = itemAverages.get(item.itemName);
    if (!avgData || avgData.weeksPresent < 2) continue; // Need at least 2 prior weeks

    const currentMarginPct = (1 - item.foodCostPct) * 100;
    const currentMarginDollars = item.unitMargin;
    const currentRevenue = item.netSales;

    // Calculate improvements
    const marginPctDelta = currentMarginPct - avgData.avgMarginPct;
    const marginDollarsDelta = currentMarginDollars - avgData.avgMarginDollars;
    const revenueDelta = currentRevenue - avgData.avgRevenue;

    // Calculate weekly dollar impact for each metric type
    // Margin % improvement: (delta % * current revenue)
    const marginPctImpact = (marginPctDelta / 100) * currentRevenue;
    // Margin $ improvement: delta * current qty
    const marginDollarsImpact = marginDollarsDelta * item.quantitySold;
    // Revenue improvement: direct delta
    const revenueImpact = revenueDelta;

    // Find the most impactful positive improvement
    let bestMetric: RecentWin["metricType"] | null = null;
    let bestImpact = 0;
    let metricLabel = "";

    if (marginPctImpact > bestImpact && marginPctDelta > 1) {
      bestMetric = "MARGIN_PCT";
      bestImpact = marginPctImpact;
      metricLabel = `Margin improved ${marginPctDelta.toFixed(0)}%`;
    }

    if (marginDollarsImpact > bestImpact && marginDollarsDelta > 0.5) {
      bestMetric = "MARGIN_DOLLARS";
      bestImpact = marginDollarsImpact;
      metricLabel = `Unit margin up $${marginDollarsDelta.toFixed(2)}`;
    }

    if (revenueImpact > bestImpact && revenueDelta > 50) {
      bestMetric = "REVENUE";
      bestImpact = revenueImpact;
      metricLabel = `Revenue up $${Math.round(revenueDelta).toLocaleString()}`;
    }

    if (bestMetric && bestImpact > 25) { // Minimum $25/week impact to be notable
      wins.push({
        itemName: item.itemName,
        category: item.category,
        metricType: bestMetric,
        metricLabel,
        weeklyImpactUsd: Math.round(bestImpact),
        comparisonPeriod: `vs ${avgData.weeksPresent}-week avg`,
      });
    }
  }

  // Sort by impact (biggest wins first)
  wins.sort((a, b) => b.weeklyImpactUsd - a.weeklyImpactUsd);

  // Return top 3 wins
  return wins.slice(0, 3);
}
