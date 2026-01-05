import { describe, it, expect } from "vitest";
import {
  scoreItems,
  generateScoringResult,
  calculateCategoryStats,
  ItemInput,
  DEFAULT_SETTINGS,
} from "../engine";

// Sample test data - designed to create clear quadrant distinctions
const createTestItems = (): ItemInput[] => [
  // Star: highest popularity, highest margin ($9.75 margin)
  {
    itemId: "1",
    itemName: "Buffalo Wings",
    category: "Appetizers",
    quantitySold: 220, // Highest
    netSales: 3080, // $14 avg price, $9.75 margin
    unitFoodCost: 4.25,
  },
  // Plowhorse: high popularity, low margin ($6 margin)
  {
    itemId: "2",
    itemName: "BBQ Burger",
    category: "Mains",
    quantitySold: 150, // High
    netSales: 2250, // $15 avg price, $6 margin
    unitFoodCost: 9.0,
  },
  // Puzzle: low popularity, high margin ($20 margin)
  {
    itemId: "3",
    itemName: "Ribeye Steak",
    category: "Mains",
    quantitySold: 40, // Low
    netSales: 1280, // $32 avg price, $20 margin
    unitFoodCost: 12.0,
  },
  // Dog: low popularity, lowest margin ($3 margin)
  {
    itemId: "4",
    itemName: "House Salad",
    category: "Salads",
    quantitySold: 25, // Low
    netSales: 200, // $8 avg price, $3 margin
    unitFoodCost: 5.0,
  },
  // Medium: medium popularity, medium margin ($10.65 margin)
  {
    itemId: "5",
    itemName: "Caesar Salad",
    category: "Salads",
    quantitySold: 110, // Medium-high
    netSales: 1375, // $12.5 avg price, $10.65 margin
    unitFoodCost: 1.85,
  },
  // Low volume dog: low popularity, negative margin
  {
    itemId: "6",
    itemName: "Special Dish",
    category: "Specials",
    quantitySold: 5, // Lowest
    netSales: 100, // $20 avg price, $12 margin
    unitFoodCost: 8.0,
  },
];

describe("scoreItems", () => {
  it("should compute basic metrics correctly", () => {
    const items = createTestItems();
    const results = scoreItems(items);

    // Find Buffalo Wings
    const wings = results.find((r) => r.itemName === "Buffalo Wings");
    expect(wings).toBeDefined();
    expect(wings!.avgPrice).toBeCloseTo(14, 0); // 3080/220
    expect(wings!.unitMargin).toBeCloseTo(9.75, 1); // 14 - 4.25
    expect(wings!.totalMargin).toBeCloseTo(2145, 0); // 9.75 * 220
  });

  it("should classify items into correct quadrants", () => {
    const items = createTestItems();
    const results = scoreItems(items);

    // Buffalo Wings has high popularity (220 qty - highest)
    // But with 6 items, need to check relative positions
    const wings = results.find((r) => r.itemName === "Buffalo Wings");
    expect(wings?.popularityPercentile).toBeGreaterThanOrEqual(60);

    // BBQ Burger has high popularity but lower margin than some items
    const burger = results.find((r) => r.itemName === "BBQ Burger");
    expect(burger?.popularityPercentile).toBeGreaterThanOrEqual(60);

    // House Salad should be low on both (25 qty, $3 margin)
    const salad = results.find((r) => r.itemName === "House Salad");
    expect(salad?.quadrant).toBe("DOG");
    expect(salad?.popularityPercentile).toBeLessThan(60);
    expect(salad?.marginPercentile).toBeLessThan(60);

    // All items should have valid quadrants
    for (const item of results) {
      expect(["STAR", "PLOWHORSE", "PUZZLE", "DOG"]).toContain(item.quadrant);
    }
  });

  it("should assign correct confidence levels", () => {
    const items = createTestItems();
    const results = scoreItems(items);

    // High volume = HIGH confidence
    const wings = results.find((r) => r.itemName === "Buffalo Wings");
    expect(wings?.confidence).toBe("HIGH");

    // Low volume = LOW confidence
    const special = results.find((r) => r.itemName === "Special Dish");
    expect(special?.confidence).toBe("LOW");
  });

  it("should recommend REPRICE for plowhorses", () => {
    const items = createTestItems();
    const results = scoreItems(items);

    const burger = results.find((r) => r.itemName === "BBQ Burger");
    expect(["REPRICE", "REWORK"]).toContain(burger?.recommendedAction);
  });

  it("should recommend REMOVE for dogs", () => {
    const items = createTestItems();
    const results = scoreItems(items);

    const salad = results.find((r) => r.itemName === "House Salad");
    expect(salad?.recommendedAction).toBe("REMOVE");
  });

  it("should respect anchor flag", () => {
    const items = createTestItems();
    // Mark House Salad as anchor
    items[3].isAnchor = true;

    const results = scoreItems(items);
    const salad = results.find((r) => r.itemName === "House Salad");

    expect(salad?.recommendedAction).toBe("KEEP");
    expect(salad?.isAnchor).toBe(true);
  });

  it("should apply price increase guardrails", () => {
    const items: ItemInput[] = [
      {
        itemId: "1",
        itemName: "Test Item",
        category: "Test",
        quantitySold: 100,
        netSales: 1000, // $10 avg price
        unitFoodCost: 8.0, // Very high cost, needs big price increase
      },
    ];

    const results = scoreItems(items, {
      maxPriceIncreasePct: 8,
      maxPriceIncreaseAmt: 2.0,
    });

    const testItem = results[0];
    if (testItem.priceChangeAmount) {
      // Should be capped at 8% of $10 = $0.80 or $2, whichever is smaller
      expect(testItem.priceChangeAmount).toBeLessThanOrEqual(2.0);
      expect(testItem.priceChangePct).toBeLessThanOrEqual(8);
    }
  });

  it("should sort results by estimated impact", () => {
    const items = createTestItems();
    const results = scoreItems(items);

    // Results should be sorted by estimatedImpact descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].estimatedImpact).toBeGreaterThanOrEqual(
        results[i].estimatedImpact
      );
    }
  });

  it("should handle empty input", () => {
    const results = scoreItems([]);
    expect(results).toEqual([]);
  });

  it("should filter out zero-quantity items", () => {
    const items: ItemInput[] = [
      {
        itemId: "1",
        itemName: "Normal Item",
        quantitySold: 50,
        netSales: 500,
        unitFoodCost: 3.0,
      },
      {
        itemId: "2",
        itemName: "Zero Qty Item",
        quantitySold: 0,
        netSales: 0,
        unitFoodCost: 3.0,
      },
    ];

    const results = scoreItems(items);
    expect(results.length).toBe(1);
    expect(results[0].itemName).toBe("Normal Item");
  });
});

describe("calculateCategoryStats", () => {
  it("should calculate category statistics", () => {
    const items = createTestItems();
    const stats = calculateCategoryStats(items);

    expect(stats.has("Appetizers")).toBe(true);
    expect(stats.has("Mains")).toBe(true);
    expect(stats.has("Salads")).toBe(true);

    const appStats = stats.get("Appetizers")!;
    expect(appStats.count).toBe(1);
    expect(appStats.medianPrice).toBeCloseTo(14, 0);
  });

  it("should calculate 85th percentile for category ceiling", () => {
    const items: ItemInput[] = [
      { itemId: "1", itemName: "A", category: "Test", quantitySold: 10, netSales: 100, unitFoodCost: 2 },
      { itemId: "2", itemName: "B", category: "Test", quantitySold: 10, netSales: 150, unitFoodCost: 3 },
      { itemId: "3", itemName: "C", category: "Test", quantitySold: 10, netSales: 200, unitFoodCost: 4 },
      { itemId: "4", itemName: "D", category: "Test", quantitySold: 10, netSales: 250, unitFoodCost: 5 },
    ];

    const stats = calculateCategoryStats(items);
    const testStats = stats.get("Test")!;

    // p85 should be close to the higher prices
    expect(testStats.p85Price).toBeGreaterThan(testStats.medianPrice);
  });
});

describe("generateScoringResult", () => {
  it("should generate summary with quadrant counts", () => {
    const items = createTestItems();
    const scored = scoreItems(items);
    const result = generateScoringResult(scored);

    expect(result.summary.totalItems).toBe(scored.length);
    expect(
      result.summary.stars +
        result.summary.plowhorses +
        result.summary.puzzles +
        result.summary.dogs
    ).toBe(scored.length);
  });

  it("should calculate total revenue and margin", () => {
    const items = createTestItems();
    const scored = scoreItems(items);
    const result = generateScoringResult(scored);

    const expectedRevenue = items
      .filter((i) => i.quantitySold > 0)
      .reduce((sum, i) => sum + i.netSales, 0);

    expect(result.summary.totalRevenue).toBeCloseTo(expectedRevenue, 0);
    expect(result.summary.totalMargin).toBeGreaterThan(0);
  });

  it("should identify top actions", () => {
    const items = createTestItems();
    const scored = scoreItems(items);
    const result = generateScoringResult(scored);

    expect(result.summary.topActions.length).toBeLessThanOrEqual(10);
    expect(result.summary.topActions.length).toBeGreaterThan(0);
  });

  it("should identify margin leaks", () => {
    const items = createTestItems();
    const scored = scoreItems(items);
    const result = generateScoringResult(scored);

    // All margin leaks should be plowhorses
    for (const leak of result.summary.marginLeaks) {
      expect(leak.quadrant).toBe("PLOWHORSE");
    }
  });

  it("should identify easy wins", () => {
    const items = createTestItems();
    const scored = scoreItems(items);
    const result = generateScoringResult(scored);

    // All easy wins should be puzzles
    for (const win of result.summary.easyWins) {
      expect(win.quadrant).toBe("PUZZLE");
    }
  });

  it("should identify watch items", () => {
    const items = createTestItems();
    const scored = scoreItems(items);
    const result = generateScoringResult(scored);

    // All watch items should have LOW confidence
    for (const watch of result.summary.watchItems) {
      expect(watch.confidence).toBe("LOW");
    }
  });
});

describe("edge cases", () => {
  it("should handle single item", () => {
    const items: ItemInput[] = [
      {
        itemId: "1",
        itemName: "Only Item",
        quantitySold: 50,
        netSales: 500,
        unitFoodCost: 3.0,
      },
    ];

    const results = scoreItems(items);
    expect(results.length).toBe(1);
    // Single item gets 50th percentile for everything
    expect(results[0].popularityPercentile).toBe(50);
  });

  it("should handle negative margins gracefully", () => {
    const items: ItemInput[] = [
      {
        itemId: "1",
        itemName: "Loss Leader",
        quantitySold: 100,
        netSales: 500, // $5 avg price
        unitFoodCost: 6.0, // Costs more than selling price
      },
    ];

    const results = scoreItems(items);
    expect(results.length).toBe(1);
    expect(results[0].unitMargin).toBeLessThan(0);
    expect(results[0].quadrant).toBe("DOG"); // Low margin = DOG
  });
});
