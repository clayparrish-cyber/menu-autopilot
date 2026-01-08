import { NextResponse } from "next/server";
import { getAuthContext, handleApiError } from "@/lib/api";
import { DataIntegrityService } from "@/lib/marginedge";

/**
 * GET /api/marginedge/integrity
 *
 * Generate a data integrity report for MarginEdge data.
 * Checks for duplicates, missing data, suspicious values, etc.
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const integrityService = new DataIntegrityService();
    const report = await integrityService.generateReport();

    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error, "Integrity report error");
  }
}
