/**
 * Shared utility functions
 */

/**
 * Round a number to N decimal places (default 2)
 */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Quadrant types
 */
export const QUADRANTS = ["STAR", "PLOWHORSE", "PUZZLE", "DOG"] as const;
export type Quadrant = (typeof QUADRANTS)[number];

/**
 * Action types
 */
export const ACTIONS = [
  "KEEP",
  "KEEP_ANCHOR",
  "PROMOTE",
  "REPRICE",
  "REPOSITION",
  "REWORK_COST",
  "REMOVE",
] as const;
export type ActionLabel = (typeof ACTIONS)[number];

/**
 * Recommended action from scoring engine
 */
export type RecommendedAction =
  | "KEEP"
  | "PROMOTE"
  | "REPRICE"
  | "REPOSITION"
  | "REWORK"
  | "REMOVE";

/**
 * Confidence levels
 */
export const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/**
 * Data quality badges
 */
export const DATA_QUALITY_BADGES = ["GOOD", "MIXED", "REVIEW"] as const;
export type DataQualityBadge = (typeof DATA_QUALITY_BADGES)[number];

/**
 * Group items by a key function
 */
export function groupBy<T, K extends string>(
  items: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = getKey(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

/**
 * Group items by quadrant
 */
export function groupByQuadrant<T extends { quadrant: Quadrant }>(
  items: T[]
): Record<Quadrant, T[]> {
  const result: Record<Quadrant, T[]> = {
    STAR: [],
    PLOWHORSE: [],
    PUZZLE: [],
    DOG: [],
  };
  for (const item of items) {
    result[item.quadrant].push(item);
  }
  return result;
}

/**
 * Get top N items from array, sorted by a key
 */
export function topN<T>(
  items: T[],
  n: number,
  getScore: (item: T) => number
): T[] {
  return [...items].sort((a, b) => getScore(b) - getScore(a)).slice(0, n);
}

/**
 * Format date as ISO string (yyyy-mm-dd)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
