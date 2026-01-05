/**
 * Unit cost computation for MarginEdge data
 *
 * Deterministic cost calculation following the preference order:
 * A) total_cost / items_sold (if both available)
 * B) avg_cost_base + (modifier_cost / items_sold) (if modifier_cost available)
 * C) avg_cost_base only (fallback)
 */

export interface MECostRow {
  itemName: string;
  itemsSold: number;
  avgCostBase: number | null;
  modifierCost: number | null;
  totalCost: number | null;
  totalRevenue: number | null;
  theoreticalCostPct: number | null;
  category?: string;
}

export interface ComputedCost {
  itemName: string;
  unitCostBase: number;
  unitCostModifiers: number | null;
  unitCostTotal: number;
  hasModifiers: boolean;
  computationPath: "A" | "B" | "C"; // For debugging
  ingestionWarnings: string[];
  // Original ME data for storage
  meItemsSold: number;
  meRevenue: number | null;
  meTotalCost: number | null;
  meTheoreticalPct: number | null;
}

/**
 * Compute unit cost from MarginEdge row data
 *
 * Preference order:
 * A) If total_cost and items_sold available: unit_cost_total = total_cost / items_sold
 * B) If modifier_cost available: unit_cost_total = avg_cost_base + (modifier_cost / items_sold)
 * C) Else: unit_cost_total = avg_cost_base
 */
export function computeUnitCost(row: MECostRow): ComputedCost | null {
  const warnings: string[] = [];

  // Validate base cost
  if (row.avgCostBase === null || row.avgCostBase === undefined) {
    return null; // Cannot compute without base cost
  }

  if (row.avgCostBase < 0) {
    warnings.push(`Negative base cost (${row.avgCostBase}) - filtered`);
    return null;
  }

  const unitCostBase = row.avgCostBase;
  let unitCostModifiers: number | null = null;
  let unitCostTotal: number;
  let computationPath: "A" | "B" | "C";
  let hasModifiers = false;

  // Path A: Use total_cost if available
  if (
    row.totalCost !== null &&
    row.totalCost > 0 &&
    row.itemsSold > 0
  ) {
    unitCostTotal = row.totalCost / row.itemsSold;
    computationPath = "A";

    // Infer modifier cost from total - base
    if (unitCostTotal > unitCostBase) {
      unitCostModifiers = unitCostTotal - unitCostBase;
      hasModifiers = true;
    }
  }
  // Path B: Use modifier_cost if available
  else if (
    row.modifierCost !== null &&
    row.modifierCost > 0 &&
    row.itemsSold > 0
  ) {
    unitCostModifiers = row.modifierCost / row.itemsSold;
    unitCostTotal = unitCostBase + unitCostModifiers;
    computationPath = "B";
    hasModifiers = true;
  }
  // Path C: Use base cost only
  else {
    unitCostTotal = unitCostBase;
    computationPath = "C";

    if (row.modifierCost === null && row.totalCost === null) {
      // No modifier data available - this is fine but note it
      // Don't add warning as this is common
    }
  }

  // Sanity check: total should be >= base
  if (unitCostTotal < unitCostBase) {
    warnings.push(
      `Total cost ($${unitCostTotal.toFixed(2)}) < base cost ($${unitCostBase.toFixed(2)}) - using base`
    );
    unitCostTotal = unitCostBase;
  }

  return {
    itemName: row.itemName,
    unitCostBase,
    unitCostModifiers,
    unitCostTotal,
    hasModifiers,
    computationPath,
    ingestionWarnings: warnings,
    meItemsSold: row.itemsSold,
    meRevenue: row.totalRevenue,
    meTotalCost: row.totalCost,
    meTheoreticalPct: row.theoreticalCostPct,
  };
}

/**
 * Parse ME CSV row to MECostRow structure
 */
export function parseMERow(
  row: Record<string, string>,
  fieldMapping: Record<string, string | null>
): MECostRow | null {
  // Reverse mapping: canonical field -> header
  const getHeader = (field: string): string | undefined => {
    for (const [header, mapped] of Object.entries(fieldMapping)) {
      if (mapped === field) return header;
    }
    return undefined;
  };

  const itemNameHeader = getHeader("item_name");
  if (!itemNameHeader || !row[itemNameHeader]?.trim()) {
    return null;
  }

  const parseNum = (header: string | undefined): number | null => {
    if (!header || !row[header]) return null;
    const val = parseFloat(row[header].replace(/[$,]/g, ""));
    return isNaN(val) ? null : val;
  };

  const parseInt = (header: string | undefined): number => {
    if (!header || !row[header]) return 0;
    const val = Number.parseInt(row[header].replace(/,/g, ""), 10);
    return isNaN(val) ? 0 : val;
  };

  const itemsSoldHeader = getHeader("items_sold_cost");
  const avgCostHeader = getHeader("avg_cost_base");
  const modifierCostHeader = getHeader("modifier_cost");
  const totalCostHeader = getHeader("total_cost");
  const totalRevenueHeader = getHeader("total_revenue_cost");
  const theoreticalHeader = getHeader("theoretical_cost_pct");
  const categoryHeader = getHeader("category");

  return {
    itemName: row[itemNameHeader].trim(),
    itemsSold: parseInt(itemsSoldHeader),
    avgCostBase: parseNum(avgCostHeader),
    modifierCost: parseNum(modifierCostHeader),
    totalCost: parseNum(totalCostHeader),
    totalRevenue: parseNum(totalRevenueHeader),
    theoreticalCostPct: parseNum(theoreticalHeader),
    category: categoryHeader ? row[categoryHeader]?.trim() : undefined,
  };
}

/**
 * Process all ME rows and build cost lookup
 */
export function processMEData(
  rows: Record<string, string>[],
  fieldMapping: Record<string, string | null>
): {
  costLookup: Map<string, number>;
  computedCosts: ComputedCost[];
  skippedCount: number;
} {
  const costLookup = new Map<string, number>();
  const computedCosts: ComputedCost[] = [];
  let skippedCount = 0;

  for (const row of rows) {
    const meRow = parseMERow(row, fieldMapping);
    if (!meRow) {
      skippedCount++;
      continue;
    }

    const computed = computeUnitCost(meRow);
    if (!computed) {
      skippedCount++;
      continue;
    }

    computedCosts.push(computed);
    costLookup.set(computed.itemName.toLowerCase(), computed.unitCostTotal);
  }

  return { costLookup, computedCosts, skippedCount };
}
