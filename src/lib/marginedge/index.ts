/**
 * MarginEdge Integration Module
 *
 * Provides two paths for cost data:
 * 1. CSV Upload (existing) - manual upload of ME menu analysis export
 * 2. API Sync (new) - direct API connection to ME
 *
 * Plus data integrity and health assessment tools.
 *
 * Note: ME API is READ-ONLY. Data must be entered in MarginEdge:
 * - Invoice capture (scan/photo)
 * - POS integration (Toast → ME)
 * - Manual entry in ME dashboard
 */

export * from "./client";
export * from "./sync";
export * from "./integrity";
export * from "./health";
