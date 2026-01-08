/**
 * Test script for MarginEdge integration
 * Run with: npx tsx scripts/test-marginedge.ts
 */

import "dotenv/config";
import { createMEClient, DataIntegrityService, MarginEdgeSyncService } from "../src/lib/marginedge";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("=".repeat(60));
  console.log("MarginEdge Integration Test");
  console.log("=".repeat(60));

  // Test 1: Connection
  console.log("\n1. Testing connection...");
  const client = createMEClient();
  if (!client) {
    console.error("ERROR: MarginEdge credentials not configured");
    console.log("Set MARGINEDGE_API_KEY and MARGINEDGE_RESTAURANT_ID in .env");
    process.exit(1);
  }

  const connectionResult = await client.testConnection();
  console.log(`   Connected: ${connectionResult.success}`);
  console.log(`   Message: ${connectionResult.message}`);
  if (connectionResult.restaurants) {
    console.log(`   Restaurants:`);
    for (const r of connectionResult.restaurants) {
      console.log(`     - ${r.name} (ID: ${r.id})`);
    }
  }

  // Test 2: Fetch categories
  console.log("\n2. Fetching categories...");
  const categories = await client.getCategories();
  console.log(`   Found ${categories.length} categories:`);
  for (const cat of categories.slice(0, 10)) {
    console.log(`     - ${cat.categoryName} (ID: ${cat.categoryId})`);
  }
  if (categories.length > 10) {
    console.log(`     ... and ${categories.length - 10} more`);
  }

  // Test 3: Fetch products
  console.log("\n3. Fetching products...");
  const { products } = await client.getProducts({ limit: 20 });
  console.log(`   Found ${products.length} products (showing first 20):`);
  for (const product of products.slice(0, 10)) {
    console.log(`     - ${product.productName}: $${product.latestPrice.toFixed(2)} / ${product.reportByUnit}`);
  }

  // Test 4: Fetch vendors
  console.log("\n4. Fetching vendors...");
  const vendors = await client.getVendors();
  console.log(`   Found ${vendors.length} vendors:`);
  for (const vendor of vendors.slice(0, 10)) {
    console.log(`     - ${vendor.vendorName}`);
  }

  // Test 5: Data integrity check
  console.log("\n5. Running data integrity check...");
  const integrityService = new DataIntegrityService();
  const report = await integrityService.generateReport();
  console.log(`   Total products: ${report.stats.totalProducts}`);
  console.log(`   Total categories: ${report.stats.totalCategories}`);
  console.log(`   Products with zero cost: ${report.stats.productsWithZeroCost}`);
  console.log(`   Average cost: $${report.stats.avgCost.toFixed(2)}`);
  console.log(`\n   Issues found: ${report.summary.totalIssues}`);
  console.log(`     - Critical: ${report.summary.critical}`);
  console.log(`     - Warnings: ${report.summary.warnings}`);
  console.log(`     - Info: ${report.summary.info}`);

  if (report.issues.length > 0) {
    console.log("\n   Top issues:");
    for (const issue of report.issues.slice(0, 5)) {
      console.log(`     [${issue.severity.toUpperCase()}] ${issue.title}`);
      console.log(`       ${issue.description.slice(0, 100)}${issue.description.length > 100 ? "..." : ""}`);
      if (issue.suggestedAction) {
        console.log(`       -> ${issue.suggestedAction}`);
      }
    }
  }

  // Test 6: Full data summary
  console.log("\n6. Getting full data summary...");
  const syncService = new MarginEdgeSyncService(prisma);
  const summary = await syncService.getDataSummary();
  console.log(`   Total products: ${summary.totalProducts}`);
  console.log(`   Categories with products:`);
  for (const cat of summary.categories.slice(0, 10)) {
    console.log(`     - ${cat.name}: ${cat.count} products`);
  }
  console.log(`   Top vendors:`);
  for (const vendor of summary.topVendors.slice(0, 5)) {
    console.log(`     - ${vendor.name}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test complete!");
  console.log("=".repeat(60));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
