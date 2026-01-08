/**
 * MarginEdge Data Health Assessment
 *
 * Evaluates the completeness and quality of ME setup for a restaurant.
 * Helps identify what needs to be done before menu optimization is viable.
 */

import { createMEClient, MEProduct, MECategory, MEVendor } from "./client";

// ============================================================================
// Types
// ============================================================================

export type HealthStatus = "good" | "needs_attention" | "critical" | "not_setup";

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  score: number; // 0-100
  details: string;
  recommendation?: string;
}

export interface DataHealthReport {
  generatedAt: Date;
  restaurantName: string;
  overallScore: number; // 0-100
  overallStatus: HealthStatus;
  readinessForMenuOptimization: boolean;
  checks: HealthCheckResult[];
  summary: {
    totalProducts: number;
    totalCategories: number;
    totalVendors: number;
    foodProducts: number;
    nonFoodProducts: number;
    productsWithCost: number;
    avgProductCost: number;
  };
  missingPieces: string[];
  nextSteps: string[];
}

// Food-related category keywords
const FOOD_CATEGORY_KEYWORDS = [
  "meat",
  "produce",
  "dairy",
  "bread",
  "grocery",
  "seafood",
  "poultry",
  "beverage",
  "beer",
  "wine",
  "liquor",
  "bar",
  "food",
  "ingredient",
];

// Non-food category keywords
const NON_FOOD_KEYWORDS = [
  "paper",
  "cleaning",
  "supplies",
  "equipment",
  "uniform",
  "marketing",
  "decor",
  "office",
  "auto",
  "repair",
  "maintenance",
  "utility",
  "rent",
  "insurance",
];

// ============================================================================
// Health Assessment Service
// ============================================================================

export class DataHealthService {
  /**
   * Generate a comprehensive health report
   */
  async generateReport(): Promise<DataHealthReport> {
    const client = createMEClient();
    if (!client) {
      return this.notConnectedReport();
    }

    let products: MEProduct[] = [];
    let categories: MECategory[] = [];
    let vendors: MEVendor[] = [];
    let restaurantName = "Unknown";

    try {
      const restaurants = await client.getRestaurants();
      if (restaurants.length > 0) {
        restaurantName = restaurants[0].name;
      }

      [products, categories, vendors] = await Promise.all([
        client.getAllProducts(),
        client.getCategories(),
        client.getVendors(),
      ]);
    } catch (error) {
      return this.errorReport(error instanceof Error ? error.message : "API Error");
    }

    // Build category lookup
    const categoryLookup = new Map<string, string>();
    for (const cat of categories) {
      categoryLookup.set(cat.categoryId, cat.categoryName.toLowerCase());
    }

    // Classify products
    const foodProducts: MEProduct[] = [];
    const nonFoodProducts: MEProduct[] = [];

    for (const product of products) {
      const categoryNames = product.categories
        .map((c) => categoryLookup.get(c.categoryId) || "")
        .join(" ");

      const isFood = FOOD_CATEGORY_KEYWORDS.some(
        (kw) => categoryNames.includes(kw) || product.productName.toLowerCase().includes(kw)
      );
      const isNonFood = NON_FOOD_KEYWORDS.some(
        (kw) => categoryNames.includes(kw) || product.productName.toLowerCase().includes(kw)
      );

      if (isFood && !isNonFood) {
        foodProducts.push(product);
      } else {
        nonFoodProducts.push(product);
      }
    }

    // Run health checks
    const checks: HealthCheckResult[] = [
      this.checkProductCount(products, foodProducts),
      this.checkCostCoverage(products),
      this.checkVendorDiversity(vendors),
      this.checkCategoryUsage(products, categories, categoryLookup),
      this.checkDataConsistency(products),
      this.checkRecentActivity(products),
      this.checkPOSIntegration(), // We can't check this via API, but note it
      this.checkRecipeSetup(products, foodProducts),
    ];

    // Calculate overall score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const overallScore = Math.round(totalScore / checks.length);

    const overallStatus: HealthStatus =
      overallScore >= 80
        ? "good"
        : overallScore >= 50
          ? "needs_attention"
          : overallScore >= 20
            ? "critical"
            : "not_setup";

    // Determine readiness
    const readinessForMenuOptimization =
      overallScore >= 60 &&
      foodProducts.length >= 50 &&
      checks.find((c) => c.name === "Recipe Setup")?.status !== "not_setup";

    // Build missing pieces and next steps
    const missingPieces: string[] = [];
    const nextSteps: string[] = [];

    for (const check of checks) {
      if (check.status === "critical" || check.status === "not_setup") {
        if (check.recommendation) {
          missingPieces.push(check.name);
          nextSteps.push(check.recommendation);
        }
      }
    }

    // Add general recommendations
    if (foodProducts.length < 50) {
      nextSteps.push(
        "Enter more food product invoices - restaurants typically have 100-300 food products"
      );
    }
    if (!this.hasRecentInvoices(products)) {
      nextSteps.push("Upload recent invoices to keep cost data current");
    }

    const productsWithCost = products.filter((p) => p.latestPrice > 0);
    const avgCost =
      productsWithCost.length > 0
        ? productsWithCost.reduce((sum, p) => sum + p.latestPrice, 0) / productsWithCost.length
        : 0;

    return {
      generatedAt: new Date(),
      restaurantName,
      overallScore,
      overallStatus,
      readinessForMenuOptimization,
      checks,
      summary: {
        totalProducts: products.length,
        totalCategories: categories.length,
        totalVendors: vendors.length,
        foodProducts: foodProducts.length,
        nonFoodProducts: nonFoodProducts.length,
        productsWithCost: productsWithCost.length,
        avgProductCost: Math.round(avgCost * 100) / 100,
      },
      missingPieces,
      nextSteps,
    };
  }

  // ============================================================================
  // Individual Health Checks
  // ============================================================================

  private checkProductCount(
    products: MEProduct[],
    foodProducts: MEProduct[]
  ): HealthCheckResult {
    const total = products.length;
    const food = foodProducts.length;

    if (food >= 100) {
      return {
        name: "Product Count",
        status: "good",
        score: 100,
        details: `${total} products (${food} food items) - good coverage`,
      };
    } else if (food >= 50) {
      return {
        name: "Product Count",
        status: "needs_attention",
        score: 70,
        details: `${total} products (${food} food items) - moderate coverage`,
        recommendation: "Add more food product invoices to improve coverage",
      };
    } else if (food >= 20) {
      return {
        name: "Product Count",
        status: "critical",
        score: 40,
        details: `Only ${food} food products - very limited data`,
        recommendation: "Upload invoices from your main food suppliers",
      };
    } else {
      return {
        name: "Product Count",
        status: "not_setup",
        score: 10,
        details: `Only ${food} food products - insufficient for menu analysis`,
        recommendation:
          "Start entering invoices from US Foods, Sysco, or local suppliers",
      };
    }
  }

  private checkCostCoverage(products: MEProduct[]): HealthCheckResult {
    const withCost = products.filter((p) => p.latestPrice > 0).length;
    const coverage = products.length > 0 ? (withCost / products.length) * 100 : 0;

    if (coverage >= 95) {
      return {
        name: "Cost Coverage",
        status: "good",
        score: 100,
        details: `${coverage.toFixed(0)}% of products have cost data`,
      };
    } else if (coverage >= 80) {
      return {
        name: "Cost Coverage",
        status: "needs_attention",
        score: 75,
        details: `${coverage.toFixed(0)}% of products have cost data`,
        recommendation: "Update invoices for products missing costs",
      };
    } else {
      return {
        name: "Cost Coverage",
        status: "critical",
        score: 40,
        details: `Only ${coverage.toFixed(0)}% of products have cost data`,
        recommendation: "Enter more invoices to establish product costs",
      };
    }
  }

  private checkVendorDiversity(vendors: MEVendor[]): HealthCheckResult {
    const count = vendors.length;

    if (count >= 10) {
      return {
        name: "Vendor Coverage",
        status: "good",
        score: 100,
        details: `${count} vendors - good supplier diversity`,
      };
    } else if (count >= 5) {
      return {
        name: "Vendor Coverage",
        status: "needs_attention",
        score: 70,
        details: `${count} vendors - moderate coverage`,
        recommendation: "Add invoices from other suppliers you use",
      };
    } else {
      return {
        name: "Vendor Coverage",
        status: "critical",
        score: 30,
        details: `Only ${count} vendors - limited supplier data`,
        recommendation: "Enter invoices from your main food distributors",
      };
    }
  }

  private checkCategoryUsage(
    products: MEProduct[],
    categories: MECategory[],
    categoryLookup: Map<string, string>
  ): HealthCheckResult {
    const usedCategories = new Set<string>();
    for (const product of products) {
      for (const cat of product.categories) {
        usedCategories.add(cat.categoryId);
      }
    }

    const usage = categories.length > 0 ? (usedCategories.size / categories.length) * 100 : 0;
    const uncategorized = products.filter((p) => p.categories.length === 0).length;

    if (usage >= 50 && uncategorized === 0) {
      return {
        name: "Category Organization",
        status: "good",
        score: 100,
        details: `Using ${usedCategories.size} of ${categories.length} categories, all products categorized`,
      };
    } else if (uncategorized > 0) {
      return {
        name: "Category Organization",
        status: "needs_attention",
        score: 60,
        details: `${uncategorized} products missing category assignment`,
        recommendation: "Assign categories to uncategorized products in MarginEdge",
      };
    } else {
      return {
        name: "Category Organization",
        status: "needs_attention",
        score: 70,
        details: `Using ${usedCategories.size} of ${categories.length} categories`,
      };
    }
  }

  private checkDataConsistency(products: MEProduct[]): HealthCheckResult {
    // Check for duplicate-ish names
    const normalizedNames = new Map<string, string[]>();
    for (const product of products) {
      const normalized = product.productName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const existing = normalizedNames.get(normalized) || [];
      existing.push(product.productName);
      normalizedNames.set(normalized, existing);
    }

    const duplicates = Array.from(normalizedNames.values()).filter((names) => names.length > 1);

    if (duplicates.length === 0) {
      return {
        name: "Data Consistency",
        status: "good",
        score: 100,
        details: "No duplicate products detected",
      };
    } else if (duplicates.length <= 5) {
      return {
        name: "Data Consistency",
        status: "needs_attention",
        score: 70,
        details: `${duplicates.length} potential duplicate product groups found`,
        recommendation: "Review and merge duplicate products in MarginEdge",
      };
    } else {
      return {
        name: "Data Consistency",
        status: "critical",
        score: 40,
        details: `${duplicates.length} potential duplicate product groups - data is messy`,
        recommendation: "Clean up duplicate products before proceeding",
      };
    }
  }

  private checkRecentActivity(products: MEProduct[]): HealthCheckResult {
    // We can't directly check invoice dates via products API, but we can infer
    // from product count whether the system is actively used
    if (products.length > 100) {
      return {
        name: "Recent Activity",
        status: "good",
        score: 80,
        details: "Product catalog suggests active usage",
      };
    } else if (products.length > 50) {
      return {
        name: "Recent Activity",
        status: "needs_attention",
        score: 60,
        details: "Moderate product catalog - verify invoices are being entered regularly",
        recommendation: "Enter invoices weekly to keep costs current",
      };
    } else {
      return {
        name: "Recent Activity",
        status: "critical",
        score: 30,
        details: "Limited products suggest sporadic usage",
        recommendation: "Establish a routine for entering invoices (ideally daily or weekly)",
      };
    }
  }

  private checkPOSIntegration(): HealthCheckResult {
    // We can't check this via API, but it's critical for menu optimization
    return {
      name: "POS Integration",
      status: "not_setup",
      score: 0,
      details: "Cannot verify POS connection via API - check in MarginEdge settings",
      recommendation:
        "Connect Toast POS to MarginEdge for automatic sales data sync",
    };
  }

  private checkRecipeSetup(
    products: MEProduct[],
    foodProducts: MEProduct[]
  ): HealthCheckResult {
    // ME API doesn't expose recipes directly, but we can infer
    // If there are food products but they're all raw ingredients, recipes aren't set up
    const hasMenuItemLikeNames = foodProducts.some(
      (p) =>
        p.productName.toLowerCase().includes("sandwich") ||
        p.productName.toLowerCase().includes("salad") ||
        p.productName.toLowerCase().includes("bowl") ||
        p.productName.toLowerCase().includes("plate")
    );

    if (hasMenuItemLikeNames) {
      return {
        name: "Recipe Setup",
        status: "needs_attention",
        score: 50,
        details: "Some menu-item-like products found - recipes may be partially set up",
        recommendation: "Verify recipes are created for all menu items in MarginEdge",
      };
    } else {
      return {
        name: "Recipe Setup",
        status: "not_setup",
        score: 0,
        details: "No menu item recipes detected - only raw ingredients in product catalog",
        recommendation:
          "Create recipes in MarginEdge to link ingredients to menu items - this is essential for menu costing",
      };
    }
  }

  private hasRecentInvoices(_products: MEProduct[]): boolean {
    // Heuristic: if product count is reasonable, assume some recent activity
    return _products.length > 50;
  }

  // ============================================================================
  // Error Reports
  // ============================================================================

  private notConnectedReport(): DataHealthReport {
    return {
      generatedAt: new Date(),
      restaurantName: "Not Connected",
      overallScore: 0,
      overallStatus: "not_setup",
      readinessForMenuOptimization: false,
      checks: [
        {
          name: "API Connection",
          status: "not_setup",
          score: 0,
          details: "MarginEdge credentials not configured",
          recommendation: "Add MARGINEDGE_API_KEY and MARGINEDGE_RESTAURANT_ID to .env",
        },
      ],
      summary: {
        totalProducts: 0,
        totalCategories: 0,
        totalVendors: 0,
        foodProducts: 0,
        nonFoodProducts: 0,
        productsWithCost: 0,
        avgProductCost: 0,
      },
      missingPieces: ["API Connection"],
      nextSteps: ["Configure MarginEdge API credentials"],
    };
  }

  private errorReport(error: string): DataHealthReport {
    return {
      generatedAt: new Date(),
      restaurantName: "Error",
      overallScore: 0,
      overallStatus: "critical",
      readinessForMenuOptimization: false,
      checks: [
        {
          name: "API Connection",
          status: "critical",
          score: 0,
          details: `API Error: ${error}`,
          recommendation: "Check API credentials and try again",
        },
      ],
      summary: {
        totalProducts: 0,
        totalCategories: 0,
        totalVendors: 0,
        foodProducts: 0,
        nonFoodProducts: 0,
        productsWithCost: 0,
        avgProductCost: 0,
      },
      missingPieces: ["API Connection"],
      nextSteps: ["Resolve API error and retry"],
    };
  }
}
