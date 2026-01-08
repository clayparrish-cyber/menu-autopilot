/**
 * MarginEdge Cost Sync Service
 *
 * Synchronizes product costs from MarginEdge to the local database.
 * ME products represent ingredients with latest invoice prices.
 */

import { PrismaClient } from "@prisma/client";
import { createMEClient, MEProduct, MECategory } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface SyncResult {
  success: boolean;
  syncedAt: Date;
  stats: {
    productsFound: number;
    categoriesFound: number;
    productsByCategory: Record<string, number>;
  };
  errors: string[];
  data?: {
    products: MEProduct[];
    categories: MECategory[];
  };
}

// ============================================================================
// Sync Service
// ============================================================================

export class MarginEdgeSyncService {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Fetch and return all data from MarginEdge
   * This is a read-only operation - doesn't update local DB yet
   */
  async fetchAllData(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedAt: new Date(),
      stats: {
        productsFound: 0,
        categoriesFound: 0,
        productsByCategory: {},
      },
      errors: [],
    };

    const client = createMEClient();
    if (!client) {
      result.errors.push("MarginEdge credentials not configured");
      return result;
    }

    try {
      // Fetch categories first to build lookup
      const categories = await client.getCategories();
      result.stats.categoriesFound = categories.length;

      const categoryLookup = new Map<string, string>();
      for (const cat of categories) {
        categoryLookup.set(cat.categoryId, cat.categoryName);
      }

      // Fetch all products
      const products = await client.getAllProducts();
      result.stats.productsFound = products.length;

      // Count products by category
      for (const product of products) {
        for (const catAlloc of product.categories) {
          const catName = categoryLookup.get(catAlloc.categoryId) || "Unknown";
          result.stats.productsByCategory[catName] =
            (result.stats.productsByCategory[catName] || 0) + 1;
        }
      }

      result.data = { products, categories };
      result.success = true;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error during sync"
      );
    }

    return result;
  }

  /**
   * Get a summary of ME data for review
   */
  async getDataSummary(): Promise<{
    totalProducts: number;
    categories: { name: string; count: number }[];
    sampleProducts: { name: string; cost: number; unit: string }[];
    topVendors: { name: string }[];
  }> {
    const client = createMEClient();
    if (!client) {
      throw new Error("MarginEdge credentials not configured");
    }

    const [categories, { products }, vendors] = await Promise.all([
      client.getCategories(),
      client.getProducts({ limit: 100 }),
      client.getVendors(),
    ]);

    // Build category lookup
    const categoryLookup = new Map<string, string>();
    const categoryCounts = new Map<string, number>();
    for (const cat of categories) {
      categoryLookup.set(cat.categoryId, cat.categoryName);
      categoryCounts.set(cat.categoryName, 0);
    }

    // Count by category
    for (const product of products) {
      for (const catAlloc of product.categories) {
        const catName = categoryLookup.get(catAlloc.categoryId) || "Unknown";
        categoryCounts.set(catName, (categoryCounts.get(catName) || 0) + 1);
      }
    }

    return {
      totalProducts: products.length,
      categories: Array.from(categoryCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count),
      sampleProducts: products.slice(0, 10).map((p) => ({
        name: p.productName,
        cost: p.latestPrice,
        unit: p.reportByUnit,
      })),
      topVendors: vendors.slice(0, 10).map((v) => ({ name: v.vendorName })),
    };
  }
}
