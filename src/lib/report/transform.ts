// lib/report/transform.ts
// Shared utilities for transforming database records to report types

import type { ItemMetrics } from "@/lib/scoring/engine";

/**
 * Database metric record type (from Prisma query with item relation)
 */
export interface DbMetricWithItem {
  itemId: string;
  item: {
    name: string;
    category: string | null;
    isAnchor: boolean;
  };
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
  explanation: unknown;
}

/**
 * Transform database metrics to ItemMetrics format with estimated impact
 * Sorted by estimated impact descending
 */
export function transformMetricsToItems(metrics: DbMetricWithItem[]): ItemMetrics[] {
  const items: ItemMetrics[] = metrics.map((metric) => {
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
      explanation: Array.isArray(metric.explanation)
        ? (metric.explanation as string[])
        : [],
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

  // Sort by estimated impact descending
  items.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

  return items;
}
