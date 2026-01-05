#!/usr/bin/env npx tsx

/**
 * Validates the sample weekly report JSON against WeeklyReportPayloadSchema
 *
 * Usage: npm run validate:sample-report
 */

import { readFileSync } from "fs";
import { join } from "path";
import { WeeklyReportPayloadSchema } from "../src/lib/report/schema";

const SAMPLE_REPORT_PATH = join(__dirname, "../templates/sample-weekly-report.json");

function main() {
  console.log("Validating sample-weekly-report.json...\n");

  // Read the sample report
  let rawData: string;
  try {
    rawData = readFileSync(SAMPLE_REPORT_PATH, "utf-8");
  } catch (err) {
    console.error(`Failed to read file: ${SAMPLE_REPORT_PATH}`);
    console.error(err);
    process.exit(1);
  }

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(rawData);
  } catch (err) {
    console.error("Failed to parse JSON:");
    console.error(err);
    process.exit(1);
  }

  // Validate against schema
  const result = WeeklyReportPayloadSchema.safeParse(data);

  if (result.success) {
    console.log("Validation successful!");
    console.log("\nReport summary:");
    console.log(`  - Report ID: ${result.data.reportId}`);
    console.log(`  - Location: ${result.data.locationName} (${result.data.accountName})`);
    console.log(`  - Week: ${result.data.weekStart} to ${result.data.weekEnd}`);
    console.log(`  - Data Quality: ${result.data.dataQuality.badge}`);
    console.log(`  - Top Actions: ${result.data.topActions.length}`);
    console.log(`  - Recommendations Table: ${result.data.topRecommendationsTable?.length ?? 0} items`);

    if (result.data.quadrantSummary) {
      const qs = result.data.quadrantSummary;
      console.log(`  - Quadrant distribution: ${qs.stars.length} Stars, ${qs.plowhorses.length} Plowhorses, ${qs.puzzles.length} Puzzles, ${qs.dogs.length} Dogs`);
    }

    console.log("\nAll checks passed!");
    process.exit(0);
  } else {
    console.error("Validation failed!\n");
    console.error("Errors:");

    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      console.error(`  - ${path || "(root)"}: ${issue.message}`);
    }

    process.exit(1);
  }
}

main();
