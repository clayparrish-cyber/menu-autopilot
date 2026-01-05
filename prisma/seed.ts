import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { scoreItems, generateScoringResult, type ItemInput } from "../src/lib/scoring/engine";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Raw item data - tuned to showcase different action types in top 3
// Goal: REPRICE (plowhorse), PROMOTE (star), REPOSITION (puzzle) in top actions
const ITEMS_DATA: Array<{ name: string; category: string; qty: number; price: number; cost: number; isAnchor?: boolean }> = [
  // HIGH VOLUME + HIGH COST = PLOWHORSE → REPRICE (will be #1 action)
  { name: "Chicken Wings (Buffalo)", category: "Appetizers", qty: 145, price: 14.0, cost: 6.50 },  // 46% food cost, high volume
  { name: "Fish Tacos", category: "Entrees", qty: 89, price: 15.0, cost: 6.25 },  // 42% food cost
  { name: "Loaded Nachos", category: "Appetizers", qty: 78, price: 13.0, cost: 5.50 },  // 42% food cost

  // HIGH VOLUME + LOW COST = STAR → PROMOTE/KEEP
  { name: "Craft Burger", category: "Entrees", qty: 102, price: 17.0, cost: 4.25 },  // 25% food cost, great margin
  { name: "Classic Cheeseburger", category: "Entrees", qty: 118, price: 15.0, cost: 3.80, isAnchor: true },  // anchor
  { name: "Margherita Pizza", category: "Entrees", qty: 84, price: 16.0, cost: 3.90 },  // 24% food cost
  { name: "House Salad", category: "Appetizers", qty: 92, price: 10.0, cost: 2.25 },  // 23% food cost

  // LOW VOLUME + HIGH MARGIN = PUZZLE → REPOSITION
  { name: "Pan-Seared Salmon", category: "Entrees", qty: 22, price: 28.0, cost: 9.50 },  // $18.50 margin but only 22 sold
  { name: "Ribeye Steak", category: "Entrees", qty: 18, price: 38.0, cost: 15.00 },  // $23 margin but only 18 sold
  { name: "Grilled Lamb Chops", category: "Entrees", qty: 12, price: 42.0, cost: 18.00 },  // $24 margin but only 12 sold

  // LOW VOLUME + LOW MARGIN = DOG → REMOVE
  { name: "Veggie Wrap", category: "Entrees", qty: 14, price: 13.0, cost: 7.80 },  // 60% food cost, low volume
  { name: "Garden Burger", category: "Entrees", qty: 11, price: 14.0, cost: 8.50 },  // 61% food cost
  { name: "Fruit Plate", category: "Sides", qty: 8, price: 8.0, cost: 5.00 },  // 63% food cost
  { name: "Lobster Mac & Cheese", category: "Entrees", qty: 9, price: 28.0, cost: 16.00 },  // high cost, low volume

  // MID-TIER items for balance
  { name: "Caesar Salad", category: "Appetizers", qty: 62, price: 12.0, cost: 3.50 },
  { name: "House Red Wine", category: "Drinks", qty: 88, price: 11.0, cost: 4.00 },
  { name: "House White Wine", category: "Drinks", qty: 82, price: 11.0, cost: 4.00 },
  { name: "Craft Beer", category: "Drinks", qty: 115, price: 8.0, cost: 2.50 },
  { name: "Margarita", category: "Drinks", qty: 72, price: 13.0, cost: 3.50 },
  { name: "Soft Drinks", category: "Drinks", qty: 95, price: 3.5, cost: 0.45 },
  { name: "French Fries", category: "Sides", qty: 105, price: 6.0, cost: 1.25 },
  { name: "Sweet Potato Fries", category: "Sides", qty: 48, price: 7.0, cost: 1.75 },
  { name: "Truffle Fries", category: "Sides", qty: 15, price: 11.0, cost: 4.00 },
  { name: "Coleslaw", category: "Sides", qty: 35, price: 4.0, cost: 0.70 },
  { name: "Chocolate Lava Cake", category: "Desserts", qty: 38, price: 10.0, cost: 3.25 },
  { name: "Cheesecake", category: "Desserts", qty: 32, price: 9.0, cost: 2.75 },
  { name: "Ice Cream Sundae", category: "Desserts", qty: 28, price: 8.0, cost: 2.25 },
  { name: "Seasonal Soup", category: "Appetizers", qty: 18, price: 8.0, cost: 2.00 },
];

async function main() {
  console.log("Seeding database with sample report data...\n");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      emailVerified: new Date(),
    },
  });
  console.log("✓ Created user:", user.email);

  // Create account
  const account = await prisma.account.upsert({
    where: { ownerId: user.id },
    update: {
      name: "Parcelle",
      targetFoodCostPct: 30,
      subscriptionTier: "TEAM",
    },
    create: {
      name: "Parcelle",
      ownerId: user.id,
      targetFoodCostPct: 30,
      minQtyThreshold: 10,
      popularityThreshold: 60,
      marginThreshold: 60,
      subscriptionTier: "TEAM",
    },
  });
  console.log("✓ Created account:", account.name);

  await prisma.user.update({
    where: { id: user.id },
    data: { accountId: account.id },
  });

  // Create location
  const location = await prisma.location.upsert({
    where: { id: "parcelle-northeast" },
    update: { name: "Parcelle - Northeast", channel: "FULL_SERVICE" },
    create: {
      id: "parcelle-northeast",
      name: "Parcelle - Northeast",
      address: "123 Restaurant Row",
      channel: "FULL_SERVICE",
      accountId: account.id,
      targetFoodCostPct: 30,
      popularityThresholdPct: 60,
      marginThresholdPct: 60,
    },
  });
  console.log("✓ Created location:", location.name);

  // Create weeks
  const currentWeekStart = new Date("2025-01-06");
  const currentWeekEnd = new Date("2025-01-12");
  const priorWeekStart = new Date("2024-12-30");
  const priorWeekEnd = new Date("2025-01-05");

  const currentWeek = await prisma.week.upsert({
    where: { locationId_weekStart_weekEnd: { locationId: location.id, weekStart: currentWeekStart, weekEnd: currentWeekEnd } },
    update: {},
    create: { locationId: location.id, weekStart: currentWeekStart, weekEnd: currentWeekEnd },
  });
  console.log("✓ Created current week: Jan 6-12, 2025");

  // Prior week snapshot for WoW
  await prisma.weekSnapshot.upsert({
    where: { locationId_weekStart_weekEnd: { locationId: location.id, weekStart: priorWeekStart, weekEnd: priorWeekEnd } },
    update: { revenue: 16850, grossMargin: 8420, itemsSold: 1245, marginPct: 50.0 },
    create: { locationId: location.id, weekStart: priorWeekStart, weekEnd: priorWeekEnd, revenue: 16850, grossMargin: 8420, itemsSold: 1245, marginPct: 50.0, categoryBreakdown: {} },
  });
  console.log("✓ Created prior week snapshot");

  // Create items first
  const itemMap = new Map<string, string>();
  for (const itemData of ITEMS_DATA) {
    const item = await prisma.item.upsert({
      where: { locationId_name: { locationId: location.id, name: itemData.name } },
      update: { isAnchor: itemData.isAnchor || false },
      create: { name: itemData.name, category: itemData.category, locationId: location.id, isAnchor: itemData.isAnchor || false },
    });
    itemMap.set(itemData.name, item.id);

    await prisma.costOverride.upsert({
      where: { id: `cost-${item.id}` },
      update: { unitFoodCost: itemData.cost },
      create: { id: `cost-${item.id}`, itemId: item.id, unitFoodCost: itemData.cost, effectiveDate: new Date("2025-01-01") },
    });
  }
  console.log(`✓ Created ${ITEMS_DATA.length} items`);

  // Prepare input for scoring engine
  const scoringInput: ItemInput[] = ITEMS_DATA.map((item) => ({
    itemId: itemMap.get(item.name)!,
    itemName: item.name,
    category: item.category,
    quantitySold: item.qty,
    netSales: item.qty * item.price,
    unitFoodCost: item.cost,
    costSource: "MANUAL" as const,
    isAnchor: item.isAnchor || false,
  }));

  // Run scoring engine to get proper quadrants
  const scoredItems = scoreItems(scoringInput, {
    targetFoodCostPct: 30,
    minQtyThreshold: 10,
    popularityThreshold: 60,
    marginThreshold: 60,
    allowPremiumPricing: false,
    maxPriceIncreasePct: 8,
    maxPriceIncreaseAmt: 2.0,
  });
  console.log("✓ Scored items with engine");

  // Log quadrant distribution
  const byQuadrant = { STAR: 0, PLOWHORSE: 0, PUZZLE: 0, DOG: 0 };
  for (const item of scoredItems) {
    byQuadrant[item.quadrant]++;
  }
  console.log(`  Quadrants: ${byQuadrant.STAR} stars, ${byQuadrant.PLOWHORSE} plowhorses, ${byQuadrant.PUZZLE} puzzles, ${byQuadrant.DOG} dogs`);

  // Create metrics from scored results
  for (const scored of scoredItems) {
    await prisma.itemWeekMetric.upsert({
      where: { itemId_weekId: { itemId: scored.itemId, weekId: currentWeek.id } },
      update: {},
      create: {
        itemId: scored.itemId,
        weekId: currentWeek.id,
        quantitySold: scored.quantitySold,
        netSales: scored.netSales,
        avgPrice: scored.avgPrice,
        unitFoodCost: scored.unitFoodCost,
        unitMargin: scored.unitMargin,
        totalMargin: scored.totalMargin,
        foodCostPct: scored.foodCostPct,
        popularityPercentile: scored.popularityPercentile,
        marginPercentile: scored.marginPercentile,
        profitPercentile: scored.profitPercentile,
        quadrant: scored.quadrant,
        recommendedAction: scored.recommendedAction,
        confidence: scored.confidence,
        explanation: scored.explanation,
        suggestedPrice: scored.suggestedPrice,
        priceChangeAmount: scored.priceChangeAmount,
        priceChangePct: scored.priceChangePct,
        costSource: scored.costSource,
      },
    });
  }
  console.log("✓ Created item week metrics");

  // Create week snapshot
  const totalRevenue = scoredItems.reduce((sum, i) => sum + i.netSales, 0);
  const totalMargin = scoredItems.reduce((sum, i) => sum + i.totalMargin, 0);
  const totalQty = scoredItems.reduce((sum, i) => sum + i.quantitySold, 0);

  await prisma.weekSnapshot.upsert({
    where: { locationId_weekStart_weekEnd: { locationId: location.id, weekStart: currentWeekStart, weekEnd: currentWeekEnd } },
    update: { revenue: totalRevenue, grossMargin: totalMargin, itemsSold: totalQty, marginPct: (totalMargin / totalRevenue) * 100 },
    create: { locationId: location.id, weekStart: currentWeekStart, weekEnd: currentWeekEnd, revenue: totalRevenue, grossMargin: totalMargin, itemsSold: totalQty, marginPct: (totalMargin / totalRevenue) * 100, categoryBreakdown: {} },
  });
  console.log("✓ Created current week snapshot");

  // Create report
  const scoringResult = generateScoringResult(scoredItems);
  const report = await prisma.report.upsert({
    where: { weekId: currentWeek.id },
    update: { summary: { totalItems: scoredItems.length, totalRevenue, totalMargin, ...byQuadrant } },
    create: { weekId: currentWeek.id, summary: { totalItems: scoredItems.length, totalRevenue, totalMargin, ...byQuadrant }, generatedAt: new Date() },
  });
  console.log("✓ Created report:", report.id);

  console.log("\n" + "=".repeat(50));
  console.log("Seed completed!");
  console.log("=".repeat(50));
  console.log("\nTest credentials:");
  console.log("  Email: demo@example.com");
  console.log("\nSample data:");
  console.log(`  Location: ${location.name}`);
  console.log(`  Week: Jan 6-12, 2025`);
  console.log(`  Items: ${scoredItems.length}`);
  console.log(`  Revenue: $${totalRevenue.toLocaleString()}`);
  console.log(`  Margin: $${totalMargin.toLocaleString()} (${((totalMargin / totalRevenue) * 100).toFixed(1)}%)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
