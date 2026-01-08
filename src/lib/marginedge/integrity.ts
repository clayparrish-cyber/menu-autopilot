/**
 * Data Integrity Review for MarginEdge Data
 *
 * Identifies data quality issues:
 * - Duplicate entries (similar names)
 * - Missing information (no cost, no category)
 * - Suspicious values (negative costs, outliers)
 * - Data consistency checks
 */

import { createMEClient, MEProduct, MECategory } from "./client";

// ============================================================================
// Types
// ============================================================================

export type IssueSeverity = "critical" | "warning" | "info";
export type IssueCategory =
  | "duplicate"
  | "missing_cost"
  | "missing_category"
  | "suspicious_value"
  | "naming_inconsistency";

export interface DataIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  affectedItems: string[];
  suggestedAction?: string;
  data?: Record<string, unknown>;
}

export interface IntegrityReport {
  generatedAt: Date;
  summary: {
    totalIssues: number;
    critical: number;
    warnings: number;
    info: number;
  };
  issues: DataIssue[];
  stats: {
    totalProducts: number;
    totalCategories: number;
    productsWithZeroCost: number;
    avgCost: number;
  };
}

// ============================================================================
// Integrity Service
// ============================================================================

export class DataIntegrityService {
  /**
   * Generate a data integrity report from MarginEdge data
   */
  async generateReport(): Promise<IntegrityReport> {
    const issues: DataIssue[] = [];

    const client = createMEClient();
    if (!client) {
      return {
        generatedAt: new Date(),
        summary: { totalIssues: 1, critical: 1, warnings: 0, info: 0 },
        issues: [
          {
            id: "no-credentials",
            category: "missing_cost",
            severity: "critical",
            title: "MarginEdge Not Connected",
            description: "MarginEdge API credentials are not configured",
            affectedItems: [],
            suggestedAction: "Add MARGINEDGE_API_KEY and MARGINEDGE_RESTAURANT_ID to .env",
          },
        ],
        stats: {
          totalProducts: 0,
          totalCategories: 0,
          productsWithZeroCost: 0,
          avgCost: 0,
        },
      };
    }

    let products: MEProduct[] = [];
    let categories: MECategory[] = [];

    try {
      [products, categories] = await Promise.all([
        client.getAllProducts(),
        client.getCategories(),
      ]);
    } catch (error) {
      issues.push({
        id: "api-error",
        category: "missing_cost",
        severity: "critical",
        title: "MarginEdge API Error",
        description: error instanceof Error ? error.message : "Failed to fetch data",
        affectedItems: [],
      });
    }

    if (products.length > 0) {
      // Build category lookup
      const categoryLookup = new Map<string, string>();
      for (const cat of categories) {
        categoryLookup.set(cat.categoryId, cat.categoryName);
      }

      // Run all checks
      issues.push(
        ...this.checkDuplicateProducts(products),
        ...this.checkZeroCostProducts(products),
        ...this.checkCostOutliers(products),
        ...this.checkMissingCategories(products, categoryLookup),
        ...this.checkNamingInconsistencies(products)
      );
    }

    // Calculate stats
    const costs = products.map((p) => p.latestPrice).filter((c) => c > 0);
    const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;

    const report: IntegrityReport = {
      generatedAt: new Date(),
      summary: {
        totalIssues: issues.length,
        critical: issues.filter((i) => i.severity === "critical").length,
        warnings: issues.filter((i) => i.severity === "warning").length,
        info: issues.filter((i) => i.severity === "info").length,
      },
      issues: issues.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      stats: {
        totalProducts: products.length,
        totalCategories: categories.length,
        productsWithZeroCost: products.filter((p) => p.latestPrice <= 0).length,
        avgCost: Math.round(avgCost * 100) / 100,
      },
    };

    return report;
  }

  /**
   * Check for duplicate products (similar names)
   */
  private checkDuplicateProducts(products: MEProduct[]): DataIssue[] {
    const issues: DataIssue[] = [];
    const nameGroups = new Map<string, MEProduct[]>();

    // Group by normalized name
    for (const product of products) {
      const normalized = this.normalizeItemName(product.productName);
      const existing = nameGroups.get(normalized) || [];
      existing.push(product);
      nameGroups.set(normalized, existing);
    }

    // Check for duplicates
    for (const [, group] of nameGroups) {
      if (group.length > 1) {
        issues.push({
          id: `dup-${group[0].companyConceptProductId}`,
          category: "duplicate",
          severity: "warning",
          title: "Potential Duplicate Products",
          description: `${group.length} products with similar names: ${group.map((p) => p.productName).join(", ")}`,
          affectedItems: group.map((p) => p.companyConceptProductId),
          suggestedAction: "Review and consolidate these products in MarginEdge",
          data: {
            products: group.map((p) => ({
              name: p.productName,
              cost: p.latestPrice,
              unit: p.reportByUnit,
            })),
          },
        });
      }
    }

    // Check for near-duplicates
    const checked = new Set<string>();
    for (let i = 0; i < products.length && i < 500; i++) {
      for (let j = i + 1; j < products.length && j < 500; j++) {
        const key = `${products[i].companyConceptProductId}-${products[j].companyConceptProductId}`;
        if (checked.has(key)) continue;
        checked.add(key);

        const similarity = this.stringSimilarity(
          products[i].productName.toLowerCase(),
          products[j].productName.toLowerCase()
        );

        if (similarity > 0.85 && similarity < 1.0) {
          issues.push({
            id: `near-dup-${products[i].companyConceptProductId}`,
            category: "duplicate",
            severity: "info",
            title: "Similar Product Names",
            description: `"${products[i].productName}" and "${products[j].productName}" are ${(similarity * 100).toFixed(0)}% similar`,
            affectedItems: [
              products[i].companyConceptProductId,
              products[j].companyConceptProductId,
            ],
            suggestedAction: "Verify these are different products",
            data: { similarity },
          });
        }
      }
    }

    return issues.slice(0, 20); // Limit to top 20
  }

  /**
   * Check for products with zero or missing cost
   */
  private checkZeroCostProducts(products: MEProduct[]): DataIssue[] {
    const issues: DataIssue[] = [];
    const zeroCost = products.filter((p) => p.latestPrice <= 0);

    if (zeroCost.length > 0) {
      issues.push({
        id: "zero-cost-products",
        category: "missing_cost",
        severity: zeroCost.length > 10 ? "critical" : "warning",
        title: `${zeroCost.length} Products with Zero/Missing Cost`,
        description: `Products without cost data: ${zeroCost.slice(0, 5).map((p) => p.productName).join(", ")}${zeroCost.length > 5 ? ` and ${zeroCost.length - 5} more` : ""}`,
        affectedItems: zeroCost.map((p) => p.companyConceptProductId),
        suggestedAction: "Add invoice data for these products in MarginEdge",
        data: { count: zeroCost.length, names: zeroCost.map((p) => p.productName) },
      });
    }

    return issues;
  }

  /**
   * Check for cost outliers using IQR method
   */
  private checkCostOutliers(products: MEProduct[]): DataIssue[] {
    const issues: DataIssue[] = [];
    const costs = products
      .filter((p) => p.latestPrice > 0)
      .map((p) => ({ product: p, cost: p.latestPrice }))
      .sort((a, b) => a.cost - b.cost);

    if (costs.length < 10) return issues;

    const q1 = costs[Math.floor(costs.length * 0.25)].cost;
    const q3 = costs[Math.floor(costs.length * 0.75)].cost;
    const iqr = q3 - q1;
    const upperBound = q3 + 2 * iqr; // Using 2x IQR for less sensitivity

    const outliers = costs.filter((c) => c.cost > upperBound);

    if (outliers.length > 0 && outliers.length < costs.length * 0.1) {
      issues.push({
        id: "cost-outliers",
        category: "suspicious_value",
        severity: "info",
        title: `${outliers.length} Products with Unusually High Costs`,
        description: `These products have costs significantly above average: ${outliers.slice(0, 5).map((o) => `${o.product.productName} ($${o.cost.toFixed(2)})`).join(", ")}`,
        affectedItems: outliers.map((o) => o.product.companyConceptProductId),
        suggestedAction: "Verify these costs are accurate (may be equipment or bulk purchases)",
        data: {
          threshold: upperBound,
          outliers: outliers.map((o) => ({
            name: o.product.productName,
            cost: o.cost,
          })),
        },
      });
    }

    return issues;
  }

  /**
   * Check for products missing category assignments
   */
  private checkMissingCategories(
    products: MEProduct[],
    categoryLookup: Map<string, string>
  ): DataIssue[] {
    const issues: DataIssue[] = [];
    const uncategorized = products.filter(
      (p) => p.categories.length === 0 || p.categories.every((c) => !categoryLookup.has(c.categoryId))
    );

    if (uncategorized.length > 0) {
      issues.push({
        id: "missing-categories",
        category: "missing_category",
        severity: "info",
        title: `${uncategorized.length} Products Without Valid Category`,
        description: `Products missing category assignment: ${uncategorized.slice(0, 5).map((p) => p.productName).join(", ")}`,
        affectedItems: uncategorized.map((p) => p.companyConceptProductId),
        suggestedAction: "Assign categories to these products in MarginEdge",
      });
    }

    return issues;
  }

  /**
   * Check for naming inconsistencies
   */
  private checkNamingInconsistencies(products: MEProduct[]): DataIssue[] {
    const issues: DataIssue[] = [];

    // Check for all-caps names
    const allCaps = products.filter(
      (p) => p.productName === p.productName.toUpperCase() && p.productName.length > 3
    );
    if (allCaps.length > 5) {
      issues.push({
        id: "all-caps-names",
        category: "naming_inconsistency",
        severity: "info",
        title: `${allCaps.length} Products with ALL CAPS Names`,
        description: "Some product names are in all capitals, which may indicate import issues",
        affectedItems: allCaps.slice(0, 10).map((p) => p.companyConceptProductId),
        suggestedAction: "Consider standardizing product name formatting",
        data: { examples: allCaps.slice(0, 5).map((p) => p.productName) },
      });
    }

    // Check for names with special characters that might be encoding issues
    const specialChars = products.filter((p) => /[^\x00-\x7F]/.test(p.productName));
    if (specialChars.length > 0) {
      issues.push({
        id: "special-chars",
        category: "naming_inconsistency",
        severity: "info",
        title: `${specialChars.length} Products with Special Characters`,
        description: "Some product names contain special characters",
        affectedItems: specialChars.slice(0, 10).map((p) => p.companyConceptProductId),
        data: { examples: specialChars.slice(0, 5).map((p) => p.productName) },
      });
    }

    return issues;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private normalizeItemName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  private stringSimilarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    const distance = this.levenshtein(a, b);
    return 1 - distance / maxLen;
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
