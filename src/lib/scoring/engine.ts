/**
 * Menu Engineering Scoring Engine
 *
 * Implements the transparent heuristics for menu analysis:
 * - Compute core metrics per item
 * - Normalize ranks within the week
 * - Classify into quadrants
 * - Generate recommended actions with guardrails
 */

import { round, groupByQuadrant } from "../utils";
import type { Quadrant, Confidence, RecommendedAction } from "../utils";
export type { Quadrant, Confidence, RecommendedAction };

export interface ItemInput {
  itemId: string;
  itemName: string;
  category?: string;
  quantitySold: number;
  netSales: number;
  unitFoodCost: number;
  unitCostBase?: number;        // Base cost before modifiers (for ME data)
  unitCostModifiers?: number;   // Modifier cost component (for ME data)
  costSource?: "MANUAL" | "MARGINEDGE" | "ESTIMATE";
  isAnchor?: boolean;
}

export interface ScoringSettings {
  targetFoodCostPct: number; // e.g., 30
  minQtyThreshold: number; // e.g., 10 for medium, 20 for high confidence
  popularityThreshold: number; // percentile, e.g., 60
  marginThreshold: number; // percentile, e.g., 60
  allowPremiumPricing: boolean;
  maxPriceIncreasePct: number; // e.g., 8
  maxPriceIncreaseAmt: number; // e.g., 2.00
}

export const DEFAULT_SETTINGS: ScoringSettings = {
  targetFoodCostPct: 30,
  minQtyThreshold: 10,
  popularityThreshold: 60,
  marginThreshold: 60,
  allowPremiumPricing: false,
  maxPriceIncreasePct: 8,
  maxPriceIncreaseAmt: 2.0,
};

export interface ItemMetrics {
  itemId: string;
  itemName: string;
  category?: string;

  // Raw inputs
  quantitySold: number;
  netSales: number;
  unitFoodCost: number;
  unitCostBase?: number;        // Base cost before modifiers (for ME data)
  unitCostModifiers?: number;   // Modifier cost component (for ME data)
  costSource: "MANUAL" | "MARGINEDGE" | "ESTIMATE";
  isAnchor: boolean;

  // Computed metrics
  avgPrice: number;
  unitMargin: number;
  totalMargin: number;
  foodCostPct: number;

  // Percentile ranks (0-100)
  popularityPercentile: number;
  marginPercentile: number;
  profitPercentile: number;

  // Classification
  quadrant: Quadrant;

  // Recommendation
  recommendedAction: RecommendedAction;
  suggestedPrice: number | null;
  priceChangeAmount: number | null;
  priceChangePct: number | null;
  confidence: Confidence;
  explanation: string[];

  // For impact sorting
  estimatedImpact: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  medianPrice: number;
  medianMargin: number;
  p85Price: number;
  avgFoodCostPct: number;
}

/**
 * Calculate percentile rank for a value in an array
 */
function percentileRank(sortedValues: number[], value: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return 50;

  let below = 0;
  for (const v of sortedValues) {
    if (v < value) below++;
  }

  return (below / (sortedValues.length - 1)) * 100;
}

/**
 * Get percentile value from sorted array
 */
function getPercentileValue(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.floor((percentile / 100) * (sortedValues.length - 1));
  return sortedValues[Math.min(index, sortedValues.length - 1)];
}

/**
 * Calculate category statistics for pricing guardrails
 */
export function calculateCategoryStats(items: ItemInput[]): Map<string, CategoryStats> {
  const categoryMap = new Map<string, ItemInput[]>();

  for (const item of items) {
    const cat = item.category || "Uncategorized";
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
    }
    categoryMap.get(cat)!.push(item);
  }

  const stats = new Map<string, CategoryStats>();

  for (const [category, catItems] of categoryMap) {
    const prices = catItems
      .filter((i) => i.quantitySold > 0)
      .map((i) => i.netSales / i.quantitySold)
      .sort((a, b) => a - b);

    const margins = catItems
      .filter((i) => i.quantitySold > 0)
      .map((i) => i.netSales / i.quantitySold - i.unitFoodCost)
      .sort((a, b) => a - b);

    const foodCostPcts = catItems
      .filter((i) => i.quantitySold > 0 && i.netSales > 0)
      .map((i) => (i.unitFoodCost / (i.netSales / i.quantitySold)) * 100);

    stats.set(category, {
      category,
      count: catItems.length,
      medianPrice: getPercentileValue(prices, 50),
      medianMargin: getPercentileValue(margins, 50),
      p85Price: getPercentileValue(prices, 85),
      avgFoodCostPct:
        foodCostPcts.length > 0
          ? foodCostPcts.reduce((a, b) => a + b, 0) / foodCostPcts.length
          : 0,
    });
  }

  return stats;
}

/**
 * Determine quadrant based on percentile thresholds
 */
function determineQuadrant(
  popularityPercentile: number,
  marginPercentile: number,
  settings: ScoringSettings
): Quadrant {
  const isHighPopularity = popularityPercentile >= settings.popularityThreshold;
  const isHighMargin = marginPercentile >= settings.marginThreshold;

  if (isHighPopularity && isHighMargin) return "STAR";
  if (isHighPopularity && !isHighMargin) return "PLOWHORSE";
  if (!isHighPopularity && isHighMargin) return "PUZZLE";
  return "DOG";
}

/**
 * Determine confidence level based on quantity sold
 */
function determineConfidence(
  quantitySold: number,
  settings: ScoringSettings
): Confidence {
  if (quantitySold >= settings.minQtyThreshold * 2) return "HIGH";
  if (quantitySold >= settings.minQtyThreshold) return "MEDIUM";
  return "LOW";
}

/**
 * Calculate suggested price for a plowhorse item
 */
function calculateSuggestedPrice(
  item: ItemInput,
  currentPrice: number,
  categoryStats: CategoryStats | undefined,
  settings: ScoringSettings
): { suggestedPrice: number | null; changeAmt: number | null; changePct: number | null } {
  // Target margin based on category or default
  const targetMargin = categoryStats?.medianMargin ?? currentPrice * 0.65;
  const targetPrice = item.unitFoodCost + targetMargin;

  // Calculate raw change
  let priceChange = targetPrice - currentPrice;

  // Apply guardrails
  const maxChangeByPct = currentPrice * (settings.maxPriceIncreasePct / 100);
  const maxChange = Math.min(maxChangeByPct, settings.maxPriceIncreaseAmt);

  priceChange = Math.min(priceChange, maxChange);

  // Don't suggest price decreases
  if (priceChange <= 0) {
    return { suggestedPrice: null, changeAmt: null, changePct: null };
  }

  let suggestedPrice = currentPrice + priceChange;

  // Check category ceiling (85th percentile)
  if (categoryStats && !settings.allowPremiumPricing) {
    suggestedPrice = Math.min(suggestedPrice, categoryStats.p85Price);
    priceChange = suggestedPrice - currentPrice;
  }

  if (priceChange <= 0) {
    return { suggestedPrice: null, changeAmt: null, changePct: null };
  }

  return {
    suggestedPrice: round(suggestedPrice),
    changeAmt: round(priceChange),
    changePct: round((priceChange / currentPrice) * 100),
  };
}

/**
 * Generate explanation bullets for an item
 */
function generateExplanation(
  metrics: Partial<ItemMetrics>,
  quadrant: Quadrant,
  action: RecommendedAction,
  categoryStats: CategoryStats | undefined
): string[] {
  const explanations: string[] = [];

  // Quadrant explanation
  switch (quadrant) {
    case "STAR":
      explanations.push("High popularity and high margin - a star performer");
      explanations.push(
        `Ranks in top ${Math.round(100 - (metrics.popularityPercentile || 0))}% for popularity`
      );
      break;
    case "PLOWHORSE":
      explanations.push("Popular item with below-average margin");
      explanations.push(
        `Food cost at ${metrics.foodCostPct?.toFixed(1)}% is above target`
      );
      break;
    case "PUZZLE":
      explanations.push("Good margin but underperforming on sales");
      explanations.push("Consider better menu placement or server push");
      break;
    case "DOG":
      explanations.push("Low popularity and low margin");
      explanations.push("Taking up menu space without contributing to profit");
      break;
  }

  // Action-specific explanation
  switch (action) {
    case "REPRICE":
      if (metrics.priceChangeAmount) {
        explanations.push(
          `Suggest price increase of $${metrics.priceChangeAmount.toFixed(2)} (${metrics.priceChangePct?.toFixed(1)}%)`
        );
      }
      if (categoryStats) {
        explanations.push(
          `Category median price is $${categoryStats.medianPrice.toFixed(2)}`
        );
      }
      break;
    case "REWORK":
      explanations.push("Consider reducing portion size or ingredient costs");
      break;
    case "REPOSITION":
      explanations.push("Try featuring on specials or with server recommendations");
      break;
    case "PROMOTE":
      explanations.push("Consider featuring more prominently on menu");
      break;
    case "REMOVE":
      if (metrics.isAnchor) {
        explanations.push("Marked as anchor item - keeping despite metrics");
      } else {
        explanations.push(
          "Consider removing or significantly reworking this item"
        );
      }
      break;
  }

  // Confidence note
  if (metrics.confidence === "LOW") {
    explanations.push("Low sales volume - collect more data before acting");
  }

  return explanations;
}

/**
 * Main scoring function - processes all items and returns scored metrics
 */
export function scoreItems(
  items: ItemInput[],
  settings: Partial<ScoringSettings> = {}
): ItemMetrics[] {
  const fullSettings = { ...DEFAULT_SETTINGS, ...settings };

  // Filter out items with no sales (adjustments)
  const validItems = items.filter(
    (i) => i.quantitySold > 0 && i.netSales > 0
  );

  if (validItems.length === 0) {
    return [];
  }

  // Calculate category stats for guardrails
  const categoryStats = calculateCategoryStats(validItems);

  // Compute base metrics
  const baseMetrics = validItems.map((item) => {
    const avgPrice = item.netSales / item.quantitySold;
    const unitMargin = avgPrice - item.unitFoodCost;
    const totalMargin = unitMargin * item.quantitySold;
    const foodCostPct = (item.unitFoodCost / avgPrice) * 100;

    return {
      ...item,
      avgPrice,
      unitMargin,
      totalMargin,
      foodCostPct,
      isAnchor: item.isAnchor || false,
      costSource: item.costSource || "ESTIMATE",
    };
  });

  // Calculate percentile ranks
  const sortedByQty = [...baseMetrics]
    .map((m) => m.quantitySold)
    .sort((a, b) => a - b);
  const sortedByMargin = [...baseMetrics]
    .map((m) => m.unitMargin)
    .sort((a, b) => a - b);
  const sortedByProfit = [...baseMetrics]
    .map((m) => m.totalMargin)
    .sort((a, b) => a - b);

  // Process each item
  const results: ItemMetrics[] = baseMetrics.map((item) => {
    const popularityPercentile = percentileRank(sortedByQty, item.quantitySold);
    const marginPercentile = percentileRank(sortedByMargin, item.unitMargin);
    const profitPercentile = percentileRank(sortedByProfit, item.totalMargin);

    const quadrant = determineQuadrant(
      popularityPercentile,
      marginPercentile,
      fullSettings
    );
    const confidence = determineConfidence(item.quantitySold, fullSettings);

    // Determine action
    let recommendedAction: RecommendedAction;
    let suggestedPrice: number | null = null;
    let priceChangeAmount: number | null = null;
    let priceChangePct: number | null = null;

    const catStats = categoryStats.get(item.category || "Uncategorized");

    switch (quadrant) {
      case "STAR":
        recommendedAction = "KEEP";
        // Check if could bump price slightly while staying a star
        if (item.avgPrice < (catStats?.medianPrice ?? item.avgPrice)) {
          recommendedAction = "PROMOTE";
        }
        break;

      case "PLOWHORSE":
        // First try repricing
        const priceResult = calculateSuggestedPrice(
          item,
          item.avgPrice,
          catStats,
          fullSettings
        );

        if (priceResult.suggestedPrice) {
          recommendedAction = "REPRICE";
          suggestedPrice = priceResult.suggestedPrice;
          priceChangeAmount = priceResult.changeAmt;
          priceChangePct = priceResult.changePct;
        } else {
          // Can't raise price, suggest reworking cost
          recommendedAction = "REWORK";
        }
        break;

      case "PUZZLE":
        recommendedAction = "REPOSITION";
        break;

      case "DOG":
        recommendedAction = item.isAnchor ? "KEEP" : "REMOVE";
        break;
    }

    // Estimate impact (for sorting)
    let estimatedImpact = 0;
    if (recommendedAction === "REPRICE" && priceChangeAmount) {
      // Impact = additional margin if price increased
      estimatedImpact = priceChangeAmount * item.quantitySold;
    } else if (recommendedAction === "REMOVE") {
      // Impact = opportunity cost (negative total margin)
      estimatedImpact = Math.abs(item.totalMargin);
    } else if (recommendedAction === "REPOSITION") {
      // Potential gain if sales doubled
      estimatedImpact = item.totalMargin;
    }

    const explanation = generateExplanation(
      {
        popularityPercentile,
        marginPercentile,
        foodCostPct: item.foodCostPct,
        priceChangeAmount,
        priceChangePct,
        confidence,
        isAnchor: item.isAnchor,
      },
      quadrant,
      recommendedAction,
      catStats
    );

    return {
      itemId: item.itemId,
      itemName: item.itemName,
      category: item.category,
      quantitySold: item.quantitySold,
      netSales: item.netSales,
      unitFoodCost: item.unitFoodCost,
      unitCostBase: item.unitCostBase,
      unitCostModifiers: item.unitCostModifiers,
      costSource: item.costSource,
      isAnchor: item.isAnchor,
      avgPrice: round(item.avgPrice),
      unitMargin: round(item.unitMargin),
      totalMargin: round(item.totalMargin),
      foodCostPct: round(item.foodCostPct),
      popularityPercentile: round(popularityPercentile),
      marginPercentile: round(marginPercentile),
      profitPercentile: round(profitPercentile),
      quadrant,
      recommendedAction,
      suggestedPrice,
      priceChangeAmount,
      priceChangePct,
      confidence,
      explanation,
      estimatedImpact: round(estimatedImpact),
    };
  });

  // Sort by estimated impact (highest first)
  results.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

  return results;
}

/**
 * Generate summary statistics from scored items
 */
export interface ScoringResult {
  items: ItemMetrics[];
  summary: {
    totalItems: number;
    stars: number;
    plowhorses: number;
    puzzles: number;
    dogs: number;
    totalRevenue: number;
    totalMargin: number;
    avgFoodCostPct: number;
    topActions: ItemMetrics[];
    marginLeaks: ItemMetrics[];
    easyWins: ItemMetrics[];
    watchItems: ItemMetrics[];
  };
}

export function generateScoringResult(items: ItemMetrics[]): ScoringResult {
  const totalRevenue = items.reduce((sum, i) => sum + i.netSales, 0);
  const totalMargin = items.reduce((sum, i) => sum + i.totalMargin, 0);
  const avgFoodCostPct =
    items.length > 0
      ? items.reduce((sum, i) => sum + i.foodCostPct, 0) / items.length
      : 0;

  const byQuadrant = groupByQuadrant(items);

  // Margin leaks: plowhorses with highest volume
  const marginLeaks = [...byQuadrant.PLOWHORSE]
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 3);

  // Easy wins: high margin puzzles
  const easyWins = byQuadrant.PUZZLE
    .filter((i) => i.confidence === "HIGH" || i.confidence === "MEDIUM")
    .sort((a, b) => b.unitMargin - a.unitMargin)
    .slice(0, 3);

  // Watch items: low confidence items
  const watchItems = items.filter((i) => i.confidence === "LOW").slice(0, 3);

  return {
    items,
    summary: {
      totalItems: items.length,
      stars: byQuadrant.STAR.length,
      plowhorses: byQuadrant.PLOWHORSE.length,
      puzzles: byQuadrant.PUZZLE.length,
      dogs: byQuadrant.DOG.length,
      totalRevenue: round(totalRevenue),
      totalMargin: round(totalMargin),
      avgFoodCostPct: round(avgFoodCostPct),
      topActions: items.slice(0, 10),
      marginLeaks,
      easyWins,
      watchItems,
    },
  };
}
