// lib/report/pdfSpec.ts
import type { WeeklyReportPayload } from "./types";

export function pdfSpec(r: WeeklyReportPayload) {
  return {
    pages: [
      {
        title: "Executive Brief",
        sections: [
          { type: "header", fields: ["locationName", "weekStart", "weekEnd", "dataQuality.badge", "dataQuality.note"] },
          { type: "summary", fields: ["focusLine", "estimatedUpsideRange"] },
          { type: "topActionsCards", items: r.topActions.slice(0, 3) },
          { type: "marginLeak", item: r.biggestMarginLeak ?? null },
          { type: "easyWin", item: r.easiestWin ?? null },
        ],
      },
      {
        title: "Matrix + Category Summary",
        sections: [
          { type: "quadrantTable", data: r.quadrantSummary ?? null },
          { type: "categorySummaryTable", rows: r.categorySummary ?? [] },
        ],
      },
      {
        title: "All Recommendations (Top 20)",
        sections: [
          {
            type: "recommendationsTable",
            rows: (r.topRecommendationsTable ?? []).slice(0, 20),
            footnote: "Low confidence = fewer than the minimum weekly quantity threshold, or missing costs.",
          },
        ],
      },
    ],
  };
}
