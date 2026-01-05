// lib/report/generator.ts
import type {
  WeeklyReportPayload,
  ActionCard,
  MarginLeak,
  EasyWin,
  WatchItem,
  DataQuality,
  SuggestedChange,
} from "./types";
import type { Quadrant, ActionLabel, Confidence, DataQualityBadge } from "../utils";
import { round, formatDateISO, groupByQuadrant, topN } from "../utils";
import type { ItemMetrics, ScoringResult } from "../scoring/engine";

import type { Channel } from "@prisma/client";
import { CHANNEL_PRESETS } from "../channel";

export interface ReportGeneratorInput {
  reportId: string;
  accountName: string;
  locationName: string;
  weekStart: Date;
  weekEnd: Date;
  scoringResult: ScoringResult;
  baseUrl: string;
  targetFoodCostPct: number;
  mappingWarnings?: string[];
  channel?: Channel;
}

/**
 * Map scoring engine action to report action label
 */
function mapActionLabel(action: string, isAnchor: boolean): ActionLabel {
  if (isAnchor && action === "KEEP") return "KEEP_ANCHOR";
  if (isAnchor && action === "REMOVE") return "KEEP_ANCHOR";

  const mapping: Record<string, ActionLabel> = {
    KEEP: "KEEP",
    PROMOTE: "PROMOTE",
    REPRICE: "REPRICE",
    REPOSITION: "REPOSITION",
    REWORK: "REWORK_COST",
    REMOVE: "REMOVE",
  };
  return mapping[action] || "KEEP";
}

/**
 * Map scoring engine quadrant to report quadrant
 */
function mapQuadrant(quadrant: string): Quadrant {
  return quadrant as Quadrant;
}

/**
 * Map confidence level
 */
function mapConfidence(confidence: string): Confidence {
  return confidence as Confidence;
}

/**
 * Calculate popularity rank (1 = highest)
 */
function calculatePopularityRank(item: ItemMetrics, allItems: ItemMetrics[]): number {
  const sorted = [...allItems].sort((a, b) => b.quantitySold - a.quantitySold);
  return sorted.findIndex((i) => i.itemId === item.itemId) + 1;
}

/**
 * Generate deterministic "why it matters" bullets
 */
function generateWhyItMatters(
  item: ItemMetrics,
  targetFoodCostPct: number
): string[] {
  const bullets: string[] = [];
  const quadrant = item.quadrant;
  const foodCostPctDisplay = item.foodCostPct.toFixed(1);

  switch (quadrant) {
    case "STAR":
      bullets.push("High popularity and high margin — a star performer.");
      bullets.push(
        `Unit margin of $${item.unitMargin.toFixed(2)} is in the top tier for your menu.`
      );
      if (item.totalMargin > 0) {
        bullets.push(
          `Contributing $${item.totalMargin.toFixed(2)} in weekly margin.`
        );
      }
      break;

    case "PLOWHORSE":
      bullets.push("Popular item with below-average margin.");
      bullets.push(
        `Food cost at ${foodCostPctDisplay}% exceeds your ${targetFoodCostPct}% target.`
      );
      if (item.priceChangeAmount && item.priceChangeAmount > 0) {
        const weeklyUpside = item.priceChangeAmount * item.quantitySold;
        bullets.push(
          `A small price adjustment could recover ~$${weeklyUpside.toFixed(0)}/week.`
        );
      }
      break;

    case "PUZZLE":
      bullets.push("Good margin but underperforming on sales volume.");
      bullets.push(
        `Unit margin of $${item.unitMargin.toFixed(2)} suggests untapped profit potential.`
      );
      bullets.push("May benefit from better menu placement or server push.");
      break;

    case "DOG":
      bullets.push("Low popularity and low margin.");
      if (item.isAnchor) {
        bullets.push("Marked as anchor item — keeping for strategic reasons.");
      } else {
        bullets.push("Taking up menu space without contributing to profit.");
        bullets.push(
          "Consider removing or significantly reworking this item."
        );
      }
      break;
  }

  return bullets.slice(0, 4);
}

/**
 * Generate primary recommendation sentence
 */
function generateRecommendationPrimary(item: ItemMetrics): string {
  const action = item.recommendedAction;

  switch (action) {
    case "KEEP":
      return item.isAnchor
        ? "Keep this anchor item unchanged."
        : "Keep this item as-is — it's performing well.";

    case "PROMOTE":
      return "Feature this item more prominently on your menu to maximize its impact.";

    case "REPRICE":
      if (item.suggestedPrice) {
        return `Raise price from $${item.avgPrice.toFixed(2)} to $${item.suggestedPrice.toFixed(2)} (+$${item.priceChangeAmount?.toFixed(2)}).`;
      }
      return "Consider a modest price increase to improve margin.";

    case "REPOSITION":
      return "Move to a higher-visibility menu position or add server talking points.";

    case "REWORK":
      return "Review portion size or ingredient costs to improve margin without price change.";

    case "REMOVE":
      return item.isAnchor
        ? "This is an anchor item — monitor but don't remove."
        : "Consider removing this item or replacing it with a higher-margin alternative.";

    default:
      return "Review this item's performance.";
  }
}

/**
 * Generate alternative recommendation
 */
function generateRecommendationAlternative(item: ItemMetrics): string | undefined {
  const action = item.recommendedAction;

  switch (action) {
    case "REPRICE":
      return "If price increase isn't feasible, review portion size or ingredient costs.";

    case "REPOSITION":
      return "If repositioning doesn't work after 2 weeks, consider a limited-time promotion.";

    case "REWORK":
      return "If cost reduction isn't possible, consider a small price increase.";

    case "REMOVE":
      if (!item.isAnchor) {
        return "If removal isn't an option, try repositioning as a special or limited offering.";
      }
      break;
  }

  return undefined;
}

/**
 * Generate guardrails and notes
 */
function generateGuardrailsAndNotes(
  item: ItemMetrics,
  categoryP85Price?: number
): string[] {
  const notes: string[] = [];

  // Price guardrail notes
  if (item.recommendedAction === "REPRICE" && item.suggestedPrice) {
    if (item.priceChangePct && item.priceChangePct > 5) {
      notes.push(
        `Price increase capped at ${item.priceChangePct.toFixed(1)}% to avoid customer pushback.`
      );
    }
    if (categoryP85Price && item.suggestedPrice >= categoryP85Price * 0.95) {
      notes.push("Suggested price approaches category ceiling — monitor customer response.");
    }
  }

  // Confidence notes
  if (item.confidence === "LOW") {
    notes.push("Low sales volume — collect 1–2 more weeks of data before acting.");
  } else if (item.confidence === "MEDIUM") {
    notes.push("Moderate confidence — consider re-evaluating after next week's data.");
  }

  // Anchor notes
  if (item.isAnchor) {
    notes.push("Anchor item — price changes may affect perceived value of other items.");
  }

  return notes.slice(0, 3);
}

/**
 * Build suggested change summary
 */
function buildSuggestedChange(item: ItemMetrics): SuggestedChange | undefined {
  const action = item.recommendedAction;

  switch (action) {
    case "REPRICE":
      if (item.suggestedPrice && item.priceChangeAmount && item.priceChangeAmount > 0) {
        return {
          type: "PRICE_INCREASE",
          priceDeltaAbs: item.priceChangeAmount,
          priceDeltaPct: item.priceChangePct ? item.priceChangePct / 100 : undefined,
          suggestedPrice: item.suggestedPrice,
        };
      }
      break;

    case "REWORK":
      return {
        type: "COST_REDUCTION_TARGET",
        notes: "Review portion size or ingredient sourcing.",
      };

    case "REPOSITION":
    case "PROMOTE":
      return {
        type: action === "REPOSITION" ? "REPOSITION" : "PROMOTE",
      };

    case "REMOVE":
      if (!item.isAnchor) {
        return {
          type: "REMOVE",
        };
      }
      break;

    case "KEEP":
      return {
        type: "KEEP",
      };
  }

  return undefined;
}

/**
 * Build action card from item metrics
 */
function buildActionCard(
  item: ItemMetrics,
  allItems: ItemMetrics[],
  targetFoodCostPct: number
): ActionCard {
  const popularityRank = calculatePopularityRank(item, allItems);

  return {
    itemName: item.itemName,
    category: item.category,
    quadrant: mapQuadrant(item.quadrant),
    action: mapActionLabel(item.recommendedAction, item.isAnchor),
    confidence: mapConfidence(item.confidence),

    kpis: {
      qtySold: item.quantitySold,
      netSales: item.netSales,
      avgPrice: item.avgPrice,
      unitCost: item.unitFoodCost,
      unitMargin: item.unitMargin,
      totalMargin: item.totalMargin,
      foodCostPct: item.foodCostPct / 100, // Convert to 0–1
    },

    ranks: {
      popularityRank,
      totalItems: allItems.length,
      popularityPercentile: item.popularityPercentile,
      marginPercentile: item.marginPercentile,
      profitPercentile: item.profitPercentile,
    },

    whyItMatters: generateWhyItMatters(item, targetFoodCostPct),
    recommendationPrimary: generateRecommendationPrimary(item),
    recommendationAlternative: generateRecommendationAlternative(item),
    guardrailsAndNotes: generateGuardrailsAndNotes(item),

    suggestedChangeSummary: buildSuggestedChange(item),
    estimatedWeeklyUpsideUsd:
      item.estimatedImpact > 0 ? item.estimatedImpact : undefined,
  };
}

/**
 * Find biggest margin leak (plowhorse with highest volume * margin gap)
 */
function findBiggestMarginLeak(
  items: ItemMetrics[],
  targetFoodCostPct: number
): MarginLeak | undefined {
  const plowhorses = items.filter((i) => i.quadrant === "PLOWHORSE");
  if (plowhorses.length === 0) return undefined;

  // Calculate margin gap for each plowhorse
  const withGap = plowhorses.map((item) => {
    const targetMarginPct = 1 - targetFoodCostPct / 100;
    const currentMarginPct = item.unitMargin / item.avgPrice;
    const marginGapPct = targetMarginPct - currentMarginPct;
    const weeklyLoss = marginGapPct * item.avgPrice * item.quantitySold;
    return { item, weeklyLoss: Math.max(0, weeklyLoss) };
  });

  withGap.sort((a, b) => b.weeklyLoss - a.weeklyLoss);
  const biggest = withGap[0];
  if (biggest.weeklyLoss <= 0) return undefined;

  const item = biggest.item;
  return {
    itemName: item.itemName,
    category: item.category,
    estimatedLossUsd: round(biggest.weeklyLoss),
    diagnosis: `Food cost of ${item.foodCostPct.toFixed(1)}% exceeds target of ${targetFoodCostPct}%, eroding margin on a high-volume item.`,
    fixes: [
      {
        label: "PRICE",
        detail: item.suggestedPrice
          ? `Raise price to $${item.suggestedPrice.toFixed(2)} to recover margin.`
          : "Consider a modest price increase within guardrails.",
      },
      {
        label: "COST_SPEC",
        detail: "Review portion size or substitute lower-cost ingredients.",
      },
    ],
  };
}

/**
 * Find easiest win (high-margin puzzle with good confidence)
 */
function findEasiestWin(items: ItemMetrics[]): EasyWin | undefined {
  const puzzles = items.filter(
    (i) =>
      i.quadrant === "PUZZLE" &&
      (i.confidence === "HIGH" || i.confidence === "MEDIUM")
  );

  if (puzzles.length === 0) return undefined;

  // Sort by unit margin (highest first)
  puzzles.sort((a, b) => b.unitMargin - a.unitMargin);
  const best = puzzles[0];

  // Estimate upside if sales doubled
  const estimatedUpside = best.totalMargin; // If sales doubled, would gain this much more

  return {
    itemName: best.itemName,
    category: best.category,
    action: "REPOSITION",
    confidence: mapConfidence(best.confidence),
    rationale: `High margin of $${best.unitMargin.toFixed(2)}/unit but low sales — better visibility could unlock profit.`,
    estimatedUpsideUsd: estimatedUpside > 0 ? round(estimatedUpside) : undefined,
  };
}

/**
 * Build watch list from low-confidence items
 */
function buildWatchList(items: ItemMetrics[]): WatchItem[] {
  const lowConfidence = items.filter((i) => i.confidence === "LOW");

  return lowConfidence.slice(0, 5).map((item) => ({
    itemName: item.itemName,
    category: item.category,
    reason: `Only ${item.quantitySold} sold — need more data before acting on ${item.recommendedAction.toLowerCase()} recommendation.`,
  }));
}

/**
 * Assess data quality
 */
function assessDataQuality(
  items: ItemMetrics[],
  mappingWarnings?: string[]
): DataQuality {
  const lowConfidenceCount = items.filter((i) => i.confidence === "LOW").length;
  const lowConfidencePct = items.length > 0 ? lowConfidenceCount / items.length : 0;
  const hasWarnings = mappingWarnings && mappingWarnings.length > 0;

  let badge: DataQualityBadge;
  let note: string;

  if (hasWarnings || lowConfidencePct > 0.5) {
    badge = "REVIEW";
    note = hasWarnings
      ? mappingWarnings![0]
      : "Over half of items have low sales volume — consider waiting for more data.";
  } else if (lowConfidencePct > 0.25) {
    badge = "MIXED";
    note = `${lowConfidenceCount} of ${items.length} items have low sales volume — recommendations for those items are tentative.`;
  } else {
    badge = "GOOD";
    note = "Sufficient data volume for confident recommendations.";
  }

  return { badge, note };
}

/**
 * Generate focus line
 */
function generateFocusLine(scoringResult: ScoringResult, channel?: Channel): string {
  const { summary } = scoringResult;
  const preset = channel ? CHANNEL_PRESETS[channel] : null;

  // Generate action-based focus
  let action: string;

  if (summary.marginLeaks.length > 0) {
    const topLeak = summary.marginLeaks[0];
    action = `Address margin on "${topLeak.itemName}"`;
  } else if (summary.plowhorses > summary.stars) {
    action = `Reprice ${summary.plowhorses} high-volume items`;
  } else if (summary.puzzles > 0 && summary.easyWins.length > 0) {
    action = `Reposition ${summary.puzzles} high-margin items`;
  } else if (summary.dogs > summary.totalItems * 0.3) {
    action = `Simplify menu by reviewing ${summary.dogs} underperformers`;
  } else {
    action = `Maintain ${summary.stars} star items`;
  }

  // Use channel template if available
  if (preset) {
    return preset.focusLineTemplate.replace("{action}", action);
  }

  // Default fallback
  return `This week's focus: ${action} to improve menu performance.`;
}

/**
 * Generate estimated upside range
 */
function generateEstimatedUpsideRange(items: ItemMetrics[]): string | undefined {
  const actionItems = items.filter(
    (i) =>
      i.recommendedAction !== "KEEP" &&
      i.estimatedImpact > 0 &&
      i.confidence !== "LOW"
  );

  if (actionItems.length === 0) return undefined;

  const totalUpside = actionItems.reduce((sum, i) => sum + i.estimatedImpact, 0);

  // Conservative range: 50% to 100% of estimated
  const low = Math.round(totalUpside * 0.5);
  const high = Math.round(totalUpside);

  if (low < 50) return undefined; // Not worth mentioning

  return `$${low}–$${high}/week`;
}

/**
 * Build quadrant summary
 */
function buildQuadrantSummary(items: ItemMetrics[]): WeeklyReportPayload["quadrantSummary"] {
  const byQuadrant = groupByQuadrant(items);
  const getTopNames = (arr: ItemMetrics[]) =>
    topN(arr, 5, (i) => i.totalMargin).map((i) => i.itemName);

  return {
    stars: getTopNames(byQuadrant.STAR),
    plowhorses: getTopNames(byQuadrant.PLOWHORSE),
    puzzles: getTopNames(byQuadrant.PUZZLE),
    dogs: getTopNames(byQuadrant.DOG),
  };
}

/**
 * Build category summary
 */
function buildCategorySummary(
  items: ItemMetrics[]
): WeeklyReportPayload["categorySummary"] {
  const categoryMap = new Map<
    string,
    { items: ItemMetrics[]; netSales: number; qtySold: number; totalMargin: number }
  >();

  for (const item of items) {
    const cat = item.category || "Uncategorized";
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { items: [], netSales: 0, qtySold: 0, totalMargin: 0 });
    }
    const entry = categoryMap.get(cat)!;
    entry.items.push(item);
    entry.netSales += item.netSales;
    entry.qtySold += item.quantitySold;
    entry.totalMargin += item.totalMargin;
  }

  const result: NonNullable<WeeklyReportPayload["categorySummary"]> = [];

  for (const [category, data] of categoryMap) {
    const avgUnitMargin =
      data.items.length > 0
        ? data.items.reduce((sum, i) => sum + i.unitMargin, 0) / data.items.length
        : undefined;

    result.push({
      category,
      netSales: round(data.netSales),
      qtySold: data.qtySold,
      avgUnitMargin: avgUnitMargin ? round(avgUnitMargin) : undefined,
      totalMargin: round(data.totalMargin),
    });
  }

  // Sort by net sales descending
  result.sort((a, b) => b.netSales - a.netSales);

  return result;
}

/**
 * Build recommendations table
 */
function buildTopRecommendationsTable(
  items: ItemMetrics[]
): WeeklyReportPayload["topRecommendationsTable"] {
  // Filter to items with actions (not just KEEP)
  const actionable = items.filter(
    (i) => i.recommendedAction !== "KEEP" || i.isAnchor
  );

  return actionable.slice(0, 20).map((item, index) => {
    let suggestedChangeText: string | undefined;

    switch (item.recommendedAction) {
      case "REPRICE":
        suggestedChangeText = item.priceChangeAmount
          ? `+$${item.priceChangeAmount.toFixed(2)}`
          : "Reprice";
        break;
      case "PROMOTE":
        suggestedChangeText = "Promote";
        break;
      case "REPOSITION":
        suggestedChangeText = "Reposition";
        break;
      case "REWORK":
        suggestedChangeText = "Rework cost";
        break;
      case "REMOVE":
        suggestedChangeText = item.isAnchor ? "Keep (Anchor)" : "Remove";
        break;
      case "KEEP":
        suggestedChangeText = item.isAnchor ? "Keep (Anchor)" : "Keep";
        break;
    }

    return {
      rank: index + 1,
      itemName: item.itemName,
      category: item.category,
      quadrant: mapQuadrant(item.quadrant),
      action: mapActionLabel(item.recommendedAction, item.isAnchor),
      confidence: mapConfidence(item.confidence),
      qtySold: item.quantitySold,
      avgPrice: item.avgPrice,
      unitCost: item.unitFoodCost,
      unitCostBase: item.unitCostBase,
      unitCostModifiers: item.unitCostModifiers,
      costSource: item.costSource,
      unitMargin: item.unitMargin,
      totalMargin: item.totalMargin,
      suggestedChangeText,
    };
  });
}

/**
 * Main generator function
 */
export function generateWeeklyReportPayload(
  input: ReportGeneratorInput
): WeeklyReportPayload {
  const {
    reportId,
    accountName,
    locationName,
    weekStart,
    weekEnd,
    scoringResult,
    baseUrl,
    targetFoodCostPct,
    mappingWarnings,
    channel,
  } = input;

  const items = scoringResult.items;

  // Build action cards (minimum 3, sorted by impact)
  const actionCards = items
    .slice(0, Math.max(10, 3))
    .map((item) => buildActionCard(item, items, targetFoodCostPct));

  // Ensure at least 3 action cards
  while (actionCards.length < 3 && items.length > actionCards.length) {
    const nextItem = items[actionCards.length];
    actionCards.push(buildActionCard(nextItem, items, targetFoodCostPct));
  }

  // If still not enough items, pad with available items
  if (actionCards.length < 3) {
    // This shouldn't happen with real data, but handle gracefully
    const remaining = 3 - actionCards.length;
    for (let i = 0; i < remaining && i < items.length; i++) {
      if (!actionCards.find((c) => c.itemName === items[i].itemName)) {
        actionCards.push(buildActionCard(items[i], items, targetFoodCostPct));
      }
    }
  }

  return {
    reportId,
    accountName,
    locationName,
    weekStart: formatDateISO(weekStart),
    weekEnd: formatDateISO(weekEnd),

    dataQuality: assessDataQuality(items, mappingWarnings),
    focusLine: generateFocusLine(scoringResult, channel),
    estimatedUpsideRange: generateEstimatedUpsideRange(items),

    topActions: actionCards,
    biggestMarginLeak: findBiggestMarginLeak(items, targetFoodCostPct),
    easiestWin: findEasiestWin(items),

    watchList: buildWatchList(items),

    links: {
      reportUrl: `${baseUrl}/reports/${reportId}`,
      recommendationsCsvUrl: `${baseUrl}/api/reports/${reportId}/csv`,
      costEditorUrl: `${baseUrl}/items`,
    },

    quadrantSummary: buildQuadrantSummary(items),
    categorySummary: buildCategorySummary(items),
    topRecommendationsTable: buildTopRecommendationsTable(items),
  };
}
