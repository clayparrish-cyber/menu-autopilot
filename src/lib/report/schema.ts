// lib/report/schema.ts
import { z } from "zod";

const Confidence = z.enum(["HIGH", "MEDIUM", "LOW"]);
const ActionLabel = z.enum([
  "KEEP",
  "PROMOTE",
  "REPRICE",
  "REPOSITION",
  "REWORK_COST",
  "REMOVE",
  "KEEP_ANCHOR",
]);
const Quadrant = z.enum(["STAR", "PLOWHORSE", "PUZZLE", "DOG"]);
const DataQualityBadge = z.enum(["GOOD", "MIXED", "REVIEW"]);

const WeekSummaryTotals = z.object({
  revenue: z.number(),
  grossMargin: z.number(),
  itemsSold: z.number().nonnegative(),
  marginPct: z.number().min(0).max(100).optional(),
});

export const WeeklyReportPayloadSchema = z.object({
  reportId: z.string().min(1),
  accountName: z.string().min(1),
  locationName: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  dataQuality: z.object({
    badge: DataQualityBadge,
    note: z.string().min(1),
  }),

  // Week-over-week comparison (optional)
  currentWeekSummary: WeekSummaryTotals.optional(),
  priorWeekSummary: WeekSummaryTotals.optional(),

  focusLine: z.string().min(1),
  estimatedUpsideRange: z.string().optional(),

  topActions: z
    .array(
      z.object({
        itemName: z.string().min(1),
        category: z.string().optional(),
        quadrant: Quadrant.optional(),
        action: ActionLabel,
        confidence: Confidence,

        kpis: z.object({
          qtySold: z.number().nonnegative(),
          netSales: z.number(),
          avgPrice: z.number().nonnegative(),
          unitCost: z.number().nonnegative().optional(),
          unitMargin: z.number().optional(),
          totalMargin: z.number().optional(),
          foodCostPct: z.number().min(0).max(1).optional(),
        }),

        ranks: z.object({
          popularityRank: z.number().int().positive(),
          totalItems: z.number().int().positive(),
          popularityPercentile: z.number().min(0).max(100),
          marginPercentile: z.number().min(0).max(100).optional(),
          profitPercentile: z.number().min(0).max(100).optional(),
        }),

        whyItMatters: z.array(z.string().min(1)).min(1),
        recommendationPrimary: z.string().min(1),
        recommendationAlternative: z.string().optional(),
        guardrailsAndNotes: z.array(z.string().min(1)).optional(),

        suggestedChangeSummary: z
          .object({
            type: z.enum([
              "PRICE_INCREASE",
              "PRICE_DECREASE",
              "COST_REDUCTION_TARGET",
              "PROMOTE",
              "REPOSITION",
              "REMOVE",
              "KEEP",
            ]),
            priceDeltaAbs: z.number().optional(),
            priceDeltaPct: z.number().min(0).max(1).optional(),
            suggestedPrice: z.number().optional(),
            notes: z.string().optional(),
          })
          .optional(),

        estimatedWeeklyUpsideUsd: z.number().optional(),
      })
    )
    .min(3),

  biggestMarginLeak: z
    .object({
      itemName: z.string().min(1),
      category: z.string().optional(),
      estimatedLossUsd: z.number().positive(),
      diagnosis: z.string().min(1),
      fixes: z
        .array(
          z.object({
            label: z.enum(["PRICE", "COST_SPEC", "MENU_PLACEMENT"]),
            detail: z.string().min(1),
          })
        )
        .min(1),
    })
    .optional(),

  easiestWin: z
    .object({
      itemName: z.string().min(1),
      category: z.string().optional(),
      action: ActionLabel,
      confidence: Confidence,
      rationale: z.string().min(1),
      estimatedUpsideUsd: z.number().optional(),
    })
    .optional(),

  watchList: z
    .array(
      z.object({
        itemName: z.string().min(1),
        category: z.string().optional(),
        reason: z.string().min(1),
      })
    )
    .optional(),

  anomalies: z
    .object({
      discountsElevated: z.string().optional(),
      refundsVoidsElevated: z.string().optional(),
      mappingWarning: z.string().optional(),
    })
    .optional(),

  links: z.object({
    reportUrl: z.string().url(),
    recommendationsCsvUrl: z.string().url(),
    costEditorUrl: z.string().url(),
  }),

  quadrantSummary: z
    .object({
      stars: z.array(z.string()).max(5),
      plowhorses: z.array(z.string()).max(5),
      puzzles: z.array(z.string()).max(5),
      dogs: z.array(z.string()).max(5),
    })
    .optional(),

  categorySummary: z
    .array(
      z.object({
        category: z.string().min(1),
        netSales: z.number(),
        qtySold: z.number().nonnegative(),
        avgUnitMargin: z.number().optional(),
        totalMargin: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),

  topRecommendationsTable: z
    .array(
      z.object({
        rank: z.number().int().positive(),
        itemName: z.string().min(1),
        category: z.string().optional(),
        quadrant: Quadrant.optional(),
        action: ActionLabel,
        confidence: Confidence,
        qtySold: z.number().nonnegative(),
        avgPrice: z.number().nonnegative(),
        unitCost: z.number().nonnegative().optional(),
        unitMargin: z.number().optional(),
        totalMargin: z.number().optional(),
        suggestedChangeText: z.string().optional(),
      })
    )
    .optional(),
});
