/**
 * Quick health check for MarginEdge data
 * Run with: npx tsx scripts/check-health.ts
 */

import "dotenv/config";
import { DataHealthService } from "../src/lib/marginedge";

async function main() {
  console.log("Generating MarginEdge Data Health Report...\n");

  const healthService = new DataHealthService();
  const report = await healthService.generateReport();

  console.log("=".repeat(60));
  console.log(`  ${report.restaurantName} - Data Health Report`);
  console.log("=".repeat(60));

  // Overall status
  const statusEmoji = {
    good: "✅",
    needs_attention: "⚠️",
    critical: "❌",
    not_setup: "🚫",
  };

  console.log(`\n  Overall Score: ${report.overallScore}/100 ${statusEmoji[report.overallStatus]}`);
  console.log(`  Ready for Menu Optimization: ${report.readinessForMenuOptimization ? "Yes ✅" : "No ❌"}`);

  // Summary stats
  console.log("\n  📊 Data Summary:");
  console.log(`     Products: ${report.summary.totalProducts} (${report.summary.foodProducts} food, ${report.summary.nonFoodProducts} non-food)`);
  console.log(`     Categories: ${report.summary.totalCategories}`);
  console.log(`     Vendors: ${report.summary.totalVendors}`);
  console.log(`     Avg Product Cost: $${report.summary.avgProductCost.toFixed(2)}`);

  // Health checks
  console.log("\n  🔍 Health Checks:");
  for (const check of report.checks) {
    const emoji = statusEmoji[check.status];
    console.log(`     ${emoji} ${check.name}: ${check.score}/100`);
    console.log(`        ${check.details}`);
  }

  // Missing pieces
  if (report.missingPieces.length > 0) {
    console.log("\n  ❗ Missing Pieces:");
    for (const piece of report.missingPieces) {
      console.log(`     - ${piece}`);
    }
  }

  // Next steps
  if (report.nextSteps.length > 0) {
    console.log("\n  📋 Recommended Next Steps:");
    for (let i = 0; i < report.nextSteps.length; i++) {
      console.log(`     ${i + 1}. ${report.nextSteps[i]}`);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);
