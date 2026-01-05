import { PrismaClient, Quadrant, RecommendedAction, Confidence } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      emailVerified: new Date(),
    },
  });

  console.log("Created demo user:", user.email);

  // Create account with settings
  const account = await prisma.account.upsert({
    where: { ownerId: user.id },
    update: {},
    create: {
      name: "Demo Restaurant",
      ownerId: user.id,
      targetFoodCostPct: 30,
      minQtyThreshold: 10,
      popularityThreshold: 60,
      marginThreshold: 60,
      subscriptionTier: "SOLO",
    },
  });

  console.log("Created account:", account.name);

  // Create location
  const location = await prisma.location.upsert({
    where: {
      id: "demo-location",
    },
    update: {},
    create: {
      id: "demo-location",
      name: "Downtown",
      address: "123 Main Street",
      accountId: account.id,
    },
  });

  console.log("Created location:", location.name);

  // Create demo items with costs
  const itemsData = [
    { name: "Fried Pickles", category: "Appetizers", cost: 2.10 },
    { name: "Loaded Nachos", category: "Appetizers", cost: 3.50 },
    { name: "Buffalo Wings", category: "Appetizers", cost: 4.25 },
    { name: "Spinach Dip", category: "Appetizers", cost: 2.75 },
    { name: "Brisket Sandwich", category: "Mains", cost: 4.35 },
    { name: "BBQ Burger", category: "Mains", cost: 3.80 },
    { name: "Grilled Chicken", category: "Mains", cost: 3.25 },
    { name: "Fish Tacos", category: "Mains", cost: 4.50 },
    { name: "Ribeye Steak", category: "Mains", cost: 12.00 },
    { name: "Caesar Salad", category: "Salads", cost: 1.85 },
    { name: "House Salad", category: "Salads", cost: 1.50 },
    { name: "Cobb Salad", category: "Salads", cost: 3.20 },
    { name: "Cheesecake", category: "Desserts", cost: 2.50 },
    { name: "Brownie Sundae", category: "Desserts", cost: 2.00 },
    { name: "Margarita", category: "Drinks", cost: 1.25 },
    { name: "House Wine", category: "Drinks", cost: 2.50 },
    { name: "Craft Beer", category: "Drinks", cost: 1.75 },
  ];

  const items = [];
  for (const data of itemsData) {
    const item = await prisma.item.upsert({
      where: {
        locationId_name: {
          locationId: location.id,
          name: data.name,
        },
      },
      update: {},
      create: {
        name: data.name,
        category: data.category,
        locationId: location.id,
      },
    });

    await prisma.costOverride.upsert({
      where: {
        id: `cost-${item.id}`,
      },
      update: { unitFoodCost: data.cost },
      create: {
        id: `cost-${item.id}`,
        itemId: item.id,
        unitFoodCost: data.cost,
        effectiveDate: new Date("2026-01-01"),
      },
    });

    items.push({ ...item, cost: data.cost });
  }

  console.log(`Created ${items.length} items with costs`);

  // Create a demo week with metrics
  const weekStart = new Date("2026-01-05");
  const weekEnd = new Date("2026-01-11");

  const week = await prisma.week.upsert({
    where: {
      locationId_weekStart_weekEnd: {
        locationId: location.id,
        weekStart,
        weekEnd,
      },
    },
    update: {},
    create: {
      locationId: location.id,
      weekStart,
      weekEnd,
    },
  });

  console.log("Created week:", weekStart.toISOString().split("T")[0], "to", weekEnd.toISOString().split("T")[0]);

  // Demo sales data (qty, price range)
  const salesData: Record<string, { qty: number; price: number }> = {
    "Fried Pickles": { qty: 180, price: 9.5 },
    "Loaded Nachos": { qty: 95, price: 13.0 },
    "Buffalo Wings": { qty: 220, price: 14.0 },
    "Spinach Dip": { qty: 45, price: 10.0 },
    "Brisket Sandwich": { qty: 95, price: 16.0 },
    "BBQ Burger": { qty: 150, price: 15.0 },
    "Grilled Chicken": { qty: 85, price: 18.0 },
    "Fish Tacos": { qty: 60, price: 14.0 },
    "Ribeye Steak": { qty: 40, price: 32.0 },
    "Caesar Salad": { qty: 110, price: 12.5 },
    "House Salad": { qty: 75, price: 8.0 },
    "Cobb Salad": { qty: 55, price: 14.0 },
    "Cheesecake": { qty: 65, price: 8.0 },
    "Brownie Sundae": { qty: 80, price: 7.0 },
    "Margarita": { qty: 250, price: 10.0 },
    "House Wine": { qty: 180, price: 9.0 },
    "Craft Beer": { qty: 320, price: 7.0 },
  };

  // Calculate metrics and create ItemWeekMetric records
  const metrics = items.map((item) => {
    const sales = salesData[item.name] || { qty: 50, price: 10 };
    const netSales = sales.qty * sales.price;
    const avgPrice = sales.price;
    const unitMargin = avgPrice - item.cost;
    const totalMargin = unitMargin * sales.qty;
    const foodCostPct = (item.cost / avgPrice) * 100;

    return {
      itemId: item.id,
      weekId: week.id,
      quantitySold: sales.qty,
      netSales,
      avgPrice,
      unitFoodCost: item.cost,
      unitMargin,
      totalMargin,
      foodCostPct,
    };
  });

  // Calculate percentiles
  const sortedByQty = [...metrics].sort((a, b) => a.quantitySold - b.quantitySold);
  const sortedByMargin = [...metrics].sort((a, b) => a.unitMargin - b.unitMargin);
  const sortedByProfit = [...metrics].sort((a, b) => a.totalMargin - b.totalMargin);

  const getPercentile = (arr: typeof metrics, item: (typeof metrics)[0], key: keyof (typeof metrics)[0]) => {
    const idx = arr.findIndex((m) => m.itemId === item.itemId);
    return (idx / (arr.length - 1)) * 100;
  };

  for (const metric of metrics) {
    const popularityPercentile = getPercentile(sortedByQty, metric, "quantitySold");
    const marginPercentile = getPercentile(sortedByMargin, metric, "unitMargin");
    const profitPercentile = getPercentile(sortedByProfit, metric, "totalMargin");

    // Determine quadrant
    const isHighPopularity = popularityPercentile >= 60;
    const isHighMargin = marginPercentile >= 60;

    let quadrant: Quadrant;
    if (isHighPopularity && isHighMargin) {
      quadrant = "STAR";
    } else if (isHighPopularity && !isHighMargin) {
      quadrant = "PLOWHORSE";
    } else if (!isHighPopularity && isHighMargin) {
      quadrant = "PUZZLE";
    } else {
      quadrant = "DOG";
    }

    // Determine action
    let recommendedAction: RecommendedAction;
    let explanation: string[] = [];

    switch (quadrant) {
      case "STAR":
        recommendedAction = "KEEP";
        explanation = [
          "High popularity and high margin - a star performer",
          "Consider featuring prominently on menu",
        ];
        break;
      case "PLOWHORSE":
        recommendedAction = "REPRICE";
        explanation = [
          "Popular but low margin - consider price increase",
          "Or reduce portion/ingredient costs",
        ];
        break;
      case "PUZZLE":
        recommendedAction = "REPOSITION";
        explanation = [
          "Good margin but low sales",
          "Try better menu placement or server recommendations",
        ];
        break;
      case "DOG":
        recommendedAction = "REMOVE";
        explanation = [
          "Low popularity and low margin",
          "Consider removing or significantly reworking",
        ];
        break;
    }

    // Determine confidence
    let confidence: Confidence;
    if (metric.quantitySold >= 20) {
      confidence = "HIGH";
    } else if (metric.quantitySold >= 10) {
      confidence = "MEDIUM";
    } else {
      confidence = "LOW";
    }

    await prisma.itemWeekMetric.upsert({
      where: {
        itemId_weekId: {
          itemId: metric.itemId,
          weekId: week.id,
        },
      },
      update: {},
      create: {
        itemId: metric.itemId,
        weekId: week.id,
        quantitySold: metric.quantitySold,
        netSales: metric.netSales,
        avgPrice: metric.avgPrice,
        unitFoodCost: metric.unitFoodCost,
        unitMargin: metric.unitMargin,
        totalMargin: metric.totalMargin,
        foodCostPct: metric.foodCostPct,
        popularityPercentile,
        marginPercentile,
        profitPercentile,
        quadrant,
        recommendedAction,
        confidence,
        explanation,
      },
    });
  }

  console.log(`Created ${metrics.length} item week metrics`);

  // Create a report
  await prisma.report.upsert({
    where: { weekId: week.id },
    update: {},
    create: {
      weekId: week.id,
      summary: {
        totalItems: items.length,
        stars: metrics.filter((m) => {
          const popP = getPercentile(sortedByQty, m, "quantitySold");
          const margP = getPercentile(sortedByMargin, m, "unitMargin");
          return popP >= 60 && margP >= 60;
        }).length,
        plowhorses: metrics.filter((m) => {
          const popP = getPercentile(sortedByQty, m, "quantitySold");
          const margP = getPercentile(sortedByMargin, m, "unitMargin");
          return popP >= 60 && margP < 60;
        }).length,
        puzzles: metrics.filter((m) => {
          const popP = getPercentile(sortedByQty, m, "quantitySold");
          const margP = getPercentile(sortedByMargin, m, "unitMargin");
          return popP < 60 && margP >= 60;
        }).length,
        dogs: metrics.filter((m) => {
          const popP = getPercentile(sortedByQty, m, "quantitySold");
          const margP = getPercentile(sortedByMargin, m, "unitMargin");
          return popP < 60 && margP < 60;
        }).length,
        totalRevenue: metrics.reduce((sum, m) => sum + m.netSales, 0),
        totalMargin: metrics.reduce((sum, m) => sum + m.totalMargin, 0),
      },
      generatedAt: new Date(),
    },
  });

  console.log("Created report");
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
