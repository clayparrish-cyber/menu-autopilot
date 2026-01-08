import { NextResponse } from "next/server";
import { getAuthContext, handleApiError } from "@/lib/api";
import { createMEClient } from "@/lib/marginedge";

/**
 * GET /api/marginedge/test
 *
 * Test the MarginEdge API connection.
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const client = createMEClient();
    if (!client) {
      return NextResponse.json({
        connected: false,
        message: "MarginEdge credentials not configured",
        hint: "Set MARGINEDGE_API_KEY and MARGINEDGE_RESTAURANT_ID in .env",
      });
    }

    const result = await client.testConnection();
    return NextResponse.json({
      connected: result.success,
      message: result.message,
      restaurants: result.restaurants,
    });
  } catch (error) {
    return handleApiError(error, "MarginEdge connection test error");
  }
}
