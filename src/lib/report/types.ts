// lib/report/types.ts

// Import and re-export shared types from utils
import type {
  Quadrant,
  ActionLabel,
  Confidence,
  DataQualityBadge,
} from "../utils";

export type { Quadrant, ActionLabel, Confidence, DataQualityBadge };

export interface ReportLinks {
  reportUrl: string;
  recommendationsCsvUrl: string;
  costEditorUrl: string;
}

export interface ItemKpis {
  qtySold: number;
  netSales: number; // dollars
  avgPrice: number; // dollars
  unitCost?: number; // dollars (optional if missing)
  unitMargin?: number; // dollars (avgPrice - unitCost)
  totalMargin?: number; // dollars (unitMargin * qtySold)
  foodCostPct?: number; // unitCost / avgPrice (0–1)
}

export interface ItemRanks {
  popularityRank: number; // 1..N (1 = highest qty)
  totalItems: number;
  popularityPercentile: number; // 0..100
  marginPercentile?: number; // 0..100 (requires unitCost)
  profitPercentile?: number; // 0..100 (requires unitCost)
}

export interface SuggestedChange {
  type:
    | "PRICE_INCREASE"
    | "PRICE_DECREASE"
    | "COST_REDUCTION_TARGET"
    | "PROMOTE"
    | "REPOSITION"
    | "REMOVE"
    | "KEEP";
  // price change guardrails: recommend either pct or absolute (or both) as computed
  priceDeltaAbs?: number; // dollars
  priceDeltaPct?: number; // 0..1
  suggestedPrice?: number; // dollars
  notes?: string; // single line
}

export interface ActionCard {
  itemName: string;
  category?: string;
  quadrant?: Quadrant;
  action: ActionLabel;
  confidence: Confidence;

  kpis: ItemKpis;
  ranks: ItemRanks;

  // short bullets, deterministic, no paragraphs
  whyItMatters: string[]; // 2–4 bullets
  recommendationPrimary: string; // single sentence
  recommendationAlternative?: string; // single sentence
  guardrailsAndNotes: string[]; // 1–3 bullets

  suggestedChangeSummary?: SuggestedChange; // structured for future use
  estimatedWeeklyUpsideUsd?: number; // optional; omit if not confident
}

export interface MarginLeak {
  itemName: string;
  category?: string;
  estimatedLossUsd: number; // positive number
  diagnosis: string; // one sentence
  confidence: Confidence;
  fixes: Array<{
    label: "PRICE" | "COST_SPEC" | "MENU_PLACEMENT";
    detail: string; // one sentence
  }>;
}

export interface EasyWin {
  itemName: string;
  category?: string;
  action: ActionLabel;
  confidence: Confidence;
  rationale: string; // one sentence
  estimatedUpsideUsd?: number;
}

export interface WatchItem {
  itemName: string;
  category?: string;
  reason: string; // one sentence
}

export interface Anomalies {
  discountsElevated?: string; // one sentence
  refundsVoidsElevated?: string; // one sentence
  mappingWarning?: string; // one sentence
}

export interface DataQuality {
  badge: DataQualityBadge;
  note: string; // one sentence
}

// Week-over-week comparison data
export interface WeekSummaryTotals {
  revenue: number;
  grossMargin: number;
  itemsSold: number;
  marginPct?: number; // computed: grossMargin / revenue
}

export interface WeeklyReportPayload {
  reportId: string;
  accountName: string;
  locationName: string;
  weekStart: string; // ISO yyyy-mm-dd
  weekEnd: string; // ISO yyyy-mm-dd

  dataQuality: DataQuality;

  // Week-over-week comparison (optional)
  currentWeekSummary?: WeekSummaryTotals;
  priorWeekSummary?: WeekSummaryTotals;

  // 1–2 lines
  focusLine: string;
  estimatedUpsideRange?: string; // e.g., "$150–$300" (string to avoid fake precision)

  topActions: ActionCard[]; // at least 3
  biggestMarginLeak?: MarginLeak;
  easiestWin?: EasyWin;

  watchList?: WatchItem[]; // 0–5
  anomalies?: Anomalies;

  links: ReportLinks;

  // for PDF page 2 / matrix
  quadrantSummary?: {
    stars: string[]; // top item names (max 5)
    plowhorses: string[];
    puzzles: string[];
    dogs: string[];
  };

  // for PDF page 2 category table
  categorySummary?: Array<{
    category: string;
    netSales: number;
    qtySold: number;
    avgUnitMargin?: number;
    totalMargin?: number;
    notes?: string;
  }>;

  // for PDF page 3 table
  topRecommendationsTable?: Array<{
    rank: number;
    itemName: string;
    category?: string;
    quadrant?: Quadrant;
    action: ActionLabel;
    confidence: Confidence;
    qtySold: number;
    avgPrice: number;
    unitCost?: number;
    unitCostBase?: number;      // Base cost before modifiers (for ME data)
    unitCostModifiers?: number; // Modifier cost component (for ME data)
    costSource?: "MANUAL" | "MARGINEDGE" | "ESTIMATE";
    unitMargin?: number;
    totalMargin?: number;
    suggestedChangeText?: string; // e.g. "+$1", "Promote", "Remove"
  }>;

  // All items lookup for Menu Matrix display (keyed by item name)
  allItemsLookup?: Record<string, {
    qtySold: number;
    avgPrice: number;
    unitMargin?: number;
    quadrant?: Quadrant;
    category?: string;
  }>;
}
