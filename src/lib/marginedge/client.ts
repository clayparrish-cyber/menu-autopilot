/**
 * MarginEdge API Client
 *
 * Connects to MarginEdge public API to sync product costs.
 * API Docs: https://developer.marginedge.com
 *
 * Available endpoints:
 * - /restaurantUnits - list restaurants the API key has access to
 * - /products - ingredient/product catalog with costs
 * - /categories - product categories
 * - /vendors - vendor list
 * - /vendors/:id/vendorItems - vendor-specific items
 * - /orders - invoice/order data
 *
 * Auth: x-api-key header + restaurantUnitId query param
 * Base URL: https://api.marginedge.com/public
 */

import { z } from "zod";

// ============================================================================
// Configuration
// ============================================================================

const ME_BASE_URL =
  process.env.MARGINEDGE_API_URL || "https://api.marginedge.com/public";

// Rate limiting: ME API allows ~60 requests/minute
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Wait 2 seconds on 429

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getMECredentials(): MECredentials | null {
  const apiKey = process.env.MARGINEDGE_API_KEY;
  const restaurantUnitId = process.env.MARGINEDGE_RESTAURANT_ID;

  if (!apiKey || !restaurantUnitId) {
    return null;
  }

  return { apiKey, restaurantUnitId };
}

export interface MECredentials {
  apiKey: string;
  restaurantUnitId: string;
}

// ============================================================================
// Response Schemas (matching actual ME API responses)
// ============================================================================

// Category allocation on products
const MECategoryAllocationSchema = z.object({
  categoryId: z.string(),
  percentAllocation: z.number(),
});

// Product from /products endpoint
export const MEProductSchema = z.object({
  companyConceptProductId: z.string(),
  centralProductId: z.string(),
  productName: z.string(),
  categories: z.array(MECategoryAllocationSchema),
  itemCount: z.number(),
  taxExempt: z.boolean(),
  reportByUnit: z.string(),
  latestPrice: z.number(),
});
export type MEProduct = z.infer<typeof MEProductSchema>;

// Products response
export const MEProductsResponseSchema = z.object({
  products: z.array(MEProductSchema),
  nextPage: z.string().nullable().optional(),
});

// Restaurant unit from /restaurantUnits
export const MERestaurantSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const MERestaurantsResponseSchema = z.object({
  restaurants: z.array(MERestaurantSchema),
});

// Category from /categories
export const MECategorySchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  parentCategoryId: z.string().nullable().optional(),
});
export type MECategory = z.infer<typeof MECategorySchema>;

export const MECategoriesResponseSchema = z.object({
  categories: z.array(MECategorySchema),
  nextPage: z.string().nullable().optional(),
});

// Vendor from /vendors
export const MEVendorSchema = z.object({
  vendorId: z.string(),
  vendorName: z.string(),
});
export type MEVendor = z.infer<typeof MEVendorSchema>;

export const MEVendorsResponseSchema = z.object({
  vendors: z.array(MEVendorSchema),
  nextPage: z.string().nullable().optional(),
});

// Order (invoice) from /orders
export const MEOrderSchema = z.object({
  orderId: z.string(),
  vendorName: z.string(),
  orderDate: z.string(),
  orderTotal: z.number(),
  status: z.string(),
});
export type MEOrder = z.infer<typeof MEOrderSchema>;

export const MEOrdersResponseSchema = z.object({
  orders: z.array(MEOrderSchema),
  nextPage: z.string().nullable().optional(),
});

// ============================================================================
// API Client
// ============================================================================

export class MarginEdgeClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly restaurantUnitId: string;
  private lastRequestTime = 0;

  constructor(credentials: MECredentials) {
    this.baseUrl = ME_BASE_URL;
    this.apiKey = credentials.apiKey;
    this.restaurantUnitId = credentials.restaurantUnitId;
  }

  private async request<T>(
    endpoint: string,
    schema: z.ZodType<T>,
    params?: Record<string, string | number>,
    skipRestaurantId = false
  ): Promise<T> {
    // Rate limiting: ensure minimum delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
      await sleep(RATE_LIMIT_DELAY_MS - timeSinceLastRequest);
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add restaurantUnitId to all requests except /restaurantUnits
    if (!skipRestaurantId) {
      url.searchParams.append("restaurantUnitId", this.restaurantUnitId);
    }

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    // Retry logic for rate limiting
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      this.lastRequestTime = Date.now();

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
          Accept: "application/json",
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : RETRY_DELAY_MS * (attempt + 1);
        console.log(
          `Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${MAX_RETRIES}`
        );
        await sleep(waitTime);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new MEAPIError(
          `MarginEdge API error: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      const data = await response.json();
      return schema.parse(data);
    }

    throw lastError || new MEAPIError("Max retries exceeded", 429);
  }

  /**
   * Get list of restaurants the API key has access to
   */
  async getRestaurants(): Promise<{ id: number; name: string }[]> {
    const result = await this.request(
      "/restaurantUnits",
      MERestaurantsResponseSchema,
      undefined,
      true // skip restaurantUnitId
    );
    return result.restaurants;
  }

  /**
   * Fetch all products (ingredients) from MarginEdge
   * Products include latestPrice which is the most recent invoice cost
   */
  async getProducts(params?: {
    limit?: number;
    searchTerm?: string;
    cursor?: string;
  }): Promise<{ products: MEProduct[]; nextPage?: string }> {
    const result = await this.request(
      "/products",
      MEProductsResponseSchema,
      params as Record<string, string | number>
    );
    return {
      products: result.products,
      nextPage: result.nextPage ?? undefined,
    };
  }

  /**
   * Fetch all products with pagination handling
   */
  async getAllProducts(): Promise<MEProduct[]> {
    const allProducts: MEProduct[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.getProducts({ limit: 100, cursor });
      allProducts.push(...result.products);
      cursor = result.nextPage;
    } while (cursor);

    return allProducts;
  }

  /**
   * Fetch all categories from MarginEdge
   */
  async getCategories(): Promise<MECategory[]> {
    const result = await this.request(
      "/categories",
      MECategoriesResponseSchema
    );
    return result.categories;
  }

  /**
   * Fetch all vendors from MarginEdge
   */
  async getVendors(): Promise<MEVendor[]> {
    const result = await this.request("/vendors", MEVendorsResponseSchema);
    return result.vendors;
  }

  /**
   * Fetch orders (invoices) by date range and status
   */
  async getOrders(params: {
    createdStartDate: string; // YYYY-MM-DD
    createdEndDate: string; // YYYY-MM-DD
    status?: "PENDING" | "POSTED" | "APPROVED";
    limit?: number;
    cursor?: string;
  }): Promise<{ orders: MEOrder[]; nextPage?: string }> {
    const result = await this.request(
      "/orders",
      MEOrdersResponseSchema,
      params as Record<string, string | number>
    );
    return {
      orders: result.orders,
      nextPage: result.nextPage ?? undefined,
    };
  }

  /**
   * Test connection to MarginEdge API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    restaurants?: { id: number; name: string }[];
  }> {
    try {
      const restaurants = await this.getRestaurants();
      return {
        success: true,
        message: `Connected to MarginEdge. Access to ${restaurants.length} restaurant(s).`,
        restaurants,
      };
    } catch (error) {
      if (error instanceof MEAPIError) {
        return { success: false, message: error.message };
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error connecting to MarginEdge",
      };
    }
  }
}

// ============================================================================
// Error Handling
// ============================================================================

export class MEAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "MEAPIError";
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createMEClient(): MarginEdgeClient | null {
  const credentials = getMECredentials();
  if (!credentials) {
    return null;
  }
  return new MarginEdgeClient(credentials);
}
