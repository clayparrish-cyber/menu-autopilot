/**
 * Cost data validation for MarginEdge imports
 */

import type { DataQualityBadge } from "../utils";

export interface MismatchWarning {
  itemName: string;
  posQty: number;
  meQty: number;
  mismatchPct: number;
}

export interface CostValidationResult {
  coverage: number; // 0-1, % of POS items with costs
  coverageBadge: DataQualityBadge;
  mismatchWarnings: MismatchWarning[];
  sanityWarnings: string[];
  staleness: "CURRENT" | "STALE";
  canProceed: boolean;
  requiresAcknowledgment: boolean;
}

export interface POSItem {
  itemName: string;
  quantitySold: number;
  avgPrice: number;
}

export interface MECostItem {
  itemName: string;
  itemsSold: number;
  avgCostBase: number;
  modifierCost?: number;
  totalCost?: number;
  totalRevenue?: number;
  theoreticalCostPct?: number;
}

/**
 * Validate cost coverage - % of POS items with costs
 */
export function validateCostCoverage(
  posItems: POSItem[],
  costLookup: Map<string, number>
): { coverage: number; badge: DataQualityBadge } {
  const itemsWithSales = posItems.filter((i) => i.quantitySold > 0);
  if (itemsWithSales.length === 0) {
    return { coverage: 0, badge: "REVIEW" };
  }

  const itemsWithCosts = itemsWithSales.filter((item) =>
    costLookup.has(item.itemName.toLowerCase())
  );

  const coverage = itemsWithCosts.length / itemsWithSales.length;

  let badge: DataQualityBadge;
  if (coverage >= 0.9) {
    badge = "GOOD";
  } else if (coverage >= 0.7) {
    badge = "MIXED";
  } else {
    badge = "REVIEW";
  }

  return { coverage, badge };
}

/**
 * Detect quantity mismatches between POS and MarginEdge data
 * Flags if >10% mismatch on 10+ high-volume items OR any top-5 item
 */
export function detectQtyMismatches(
  posItems: POSItem[],
  meItems: MECostItem[]
): MismatchWarning[] {
  const warnings: MismatchWarning[] = [];

  // Create ME lookup by normalized name
  const meLookup = new Map<string, MECostItem>();
  for (const item of meItems) {
    meLookup.set(item.itemName.toLowerCase(), item);
  }

  // Sort POS items by quantity to identify top sellers
  const sortedPos = [...posItems]
    .filter((i) => i.quantitySold > 0)
    .sort((a, b) => b.quantitySold - a.quantitySold);

  for (const posItem of sortedPos) {
    const meItem = meLookup.get(posItem.itemName.toLowerCase());
    if (!meItem || meItem.itemsSold === 0) continue;

    const mismatchPct =
      Math.abs(posItem.quantitySold - meItem.itemsSold) /
      Math.max(1, posItem.quantitySold);

    if (mismatchPct > 0.1) {
      warnings.push({
        itemName: posItem.itemName,
        posQty: posItem.quantitySold,
        meQty: meItem.itemsSold,
        mismatchPct,
      });
    }
  }

  return warnings;
}

/**
 * Check if mismatch warnings should trigger REVIEW status
 */
export function shouldReviewMismatches(
  warnings: MismatchWarning[],
  posItems: POSItem[]
): boolean {
  if (warnings.length === 0) return false;

  // Get top 5 items by quantity
  const top5 = [...posItems]
    .filter((i) => i.quantitySold > 0)
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 5)
    .map((i) => i.itemName.toLowerCase());

  // Check if any top-5 item has mismatch
  const hasTop5Mismatch = warnings.some((w) =>
    top5.includes(w.itemName.toLowerCase())
  );

  // Check if 10+ high-volume items have mismatches
  const hasHighVolumeMismatches = warnings.length >= 10;

  return hasTop5Mismatch || hasHighVolumeMismatches;
}

/**
 * Perform sanity checks on cost data
 */
export function sanityCostChecks(
  meItems: MECostItem[],
  posItems: POSItem[]
): string[] {
  const warnings: string[] = [];

  // Create POS lookup for price comparison
  const posLookup = new Map<string, POSItem>();
  for (const item of posItems) {
    posLookup.set(item.itemName.toLowerCase(), item);
  }

  let negativeCostCount = 0;
  let costExceedsPriceCount = 0;
  let totalCompared = 0;

  for (const meItem of meItems) {
    // Check for negative costs
    if (meItem.avgCostBase < 0) {
      negativeCostCount++;
      continue;
    }

    // Compare cost to price
    const posItem = posLookup.get(meItem.itemName.toLowerCase());
    if (posItem && posItem.avgPrice > 0) {
      totalCompared++;
      const totalCost =
        meItem.totalCost ??
        meItem.avgCostBase + (meItem.modifierCost ?? 0) / Math.max(1, meItem.itemsSold);

      if (totalCost > posItem.avgPrice) {
        costExceedsPriceCount++;
      }
    }
  }

  if (negativeCostCount > 0) {
    warnings.push(
      `${negativeCostCount} items have negative costs and will be filtered out.`
    );
  }

  if (totalCompared > 0) {
    const exceedsPct = costExceedsPriceCount / totalCompared;
    if (exceedsPct > 0.1) {
      warnings.push(
        `${costExceedsPriceCount} items (${(exceedsPct * 100).toFixed(0)}%) have costs higher than price. Check recipe setup or modifiers.`
      );
    }
  }

  return warnings;
}

/**
 * Check if ME date range matches POS date range
 */
export function checkDateAlignment(
  meWeekStart: Date,
  meWeekEnd: Date,
  posWeekStart: Date,
  posWeekEnd: Date
): "CURRENT" | "STALE" {
  // Compare dates (ignoring time component)
  const meStart = meWeekStart.toISOString().split("T")[0];
  const meEnd = meWeekEnd.toISOString().split("T")[0];
  const posStart = posWeekStart.toISOString().split("T")[0];
  const posEnd = posWeekEnd.toISOString().split("T")[0];

  if (meStart === posStart && meEnd === posEnd) {
    return "CURRENT";
  }

  return "STALE";
}

/**
 * Run all cost validation checks
 */
export function validateCostData(
  posItems: POSItem[],
  meItems: MECostItem[],
  costLookup: Map<string, number>,
  meWeekStart?: Date,
  meWeekEnd?: Date,
  posWeekStart?: Date,
  posWeekEnd?: Date
): CostValidationResult {
  // Coverage check
  const { coverage, badge: coverageBadge } = validateCostCoverage(
    posItems,
    costLookup
  );

  // Mismatch detection
  const mismatchWarnings = detectQtyMismatches(posItems, meItems);
  const hasMismatchIssue = shouldReviewMismatches(mismatchWarnings, posItems);

  // Sanity checks
  const sanityWarnings = sanityCostChecks(meItems, posItems);

  // Date alignment
  let staleness: "CURRENT" | "STALE" = "CURRENT";
  if (meWeekStart && meWeekEnd && posWeekStart && posWeekEnd) {
    staleness = checkDateAlignment(
      meWeekStart,
      meWeekEnd,
      posWeekStart,
      posWeekEnd
    );
  }

  // Determine if user can proceed
  const hasReviewIssue =
    coverageBadge === "REVIEW" ||
    hasMismatchIssue ||
    staleness === "STALE" ||
    sanityWarnings.some((w) => w.includes("higher than price"));

  return {
    coverage,
    coverageBadge,
    mismatchWarnings: mismatchWarnings.slice(0, 10), // Limit to top 10
    sanityWarnings,
    staleness,
    canProceed: true, // Always allow with acknowledgment
    requiresAcknowledgment: hasReviewIssue,
  };
}
