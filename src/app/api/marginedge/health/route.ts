import { NextResponse } from "next/server";
import { getAuthContext, handleApiError } from "@/lib/api";
import { DataHealthService } from "@/lib/marginedge";

/**
 * GET /api/marginedge/health
 *
 * Generate a data health assessment for the MarginEdge setup.
 * Shows what's working, what's missing, and what needs to be done.
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const healthService = new DataHealthService();
    const report = await healthService.generateReport();

    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error, "Health report error");
  }
}
