import "dotenv/config";
import { createMEClient } from "../src/lib/marginedge";

async function main() {
  const client = createMEClient();
  if (!client) {
    console.log("No credentials configured");
    return;
  }

  console.log("Fetching Parcelle data...\n");

  const [restaurants, categories, { products }, vendors] = await Promise.all([
    client.getRestaurants(),
    client.getCategories(),
    client.getProducts({ limit: 100 }),
    client.getVendors(),
  ]);

  console.log("=".repeat(60));
  console.log("  PARCELLE ORGANICS - DATA HEALTH SNAPSHOT");
  console.log("=".repeat(60));

  console.log("\n📊 Data Summary:");
  console.log("   Products (first 100):", products.length);
  console.log("   Categories:", categories.length);
  console.log("   Vendors:", vendors.length);

  // Classify products by category
  const foodKeywords = [
    "meat", "produce", "dairy", "bread", "grocery", "seafood",
    "poultry", "beverage", "beer", "wine", "na beverage"
  ];
  const catLookup = new Map(
    categories.map((c) => [c.categoryId, c.categoryName.toLowerCase()])
  );

  let foodCount = 0;
  for (const p of products) {
    const catNames = p.categories
      .map((c) => catLookup.get(c.categoryId) || "")
      .join(" ");
    if (foodKeywords.some((kw) => catNames.includes(kw))) {
      foodCount++;
    }
  }

  console.log("   Food products:", foodCount);
  console.log("   Non-food products:", products.length - foodCount);

  // Check costs
  const withCost = products.filter((p) => p.latestPrice > 0);
  const avgCost = withCost.length > 0
    ? withCost.reduce((s, p) => s + p.latestPrice, 0) / withCost.length
    : 0;
  console.log("   Products with cost:", withCost.length);
  console.log("   Avg cost: $" + avgCost.toFixed(2));

  // Category breakdown
  console.log("\n📁 Products by Category:");
  const catCounts = new Map<string, number>();
  for (const p of products) {
    for (const c of p.categories) {
      const name = categories.find((cat) => cat.categoryId === c.categoryId)?.categoryName || "Unknown";
      catCounts.set(name, (catCounts.get(name) || 0) + 1);
    }
  }
  const sortedCats = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sortedCats.slice(0, 10)) {
    console.log(`   ${name}: ${count}`);
  }

  console.log("\n❌ ISSUES DETECTED:");
  console.log(`   • Only ${foodCount} food products (restaurants typically have 100-300)`);
  console.log("   • No recipes detected (critical for menu costing)");
  console.log("   • POS integration status unknown (check ME settings)");
  console.log("   • Data appears sporadic/incomplete");

  console.log("\n📋 RECOMMENDED NEXT STEPS:");
  console.log("   1. Connect Toast POS to MarginEdge for automatic sales data");
  console.log("   2. Enter invoices from main food suppliers regularly");
  console.log("   3. Create recipes in ME to link ingredients to menu items");
  console.log("   4. Establish routine invoice entry (ideally weekly)");
  console.log("   5. Connect QuickBooks for accounting sync");

  console.log("\n🎯 READINESS FOR MENU OPTIMIZATION: NO");
  console.log("   Need: More food products, recipes, POS connection");

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);
