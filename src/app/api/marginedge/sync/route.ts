import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext, handleApiError } from "@/lib/api";
import { MarginEdgeSyncService } from "@/lib/marginedge";

/**
 * GET /api/marginedge/sync
 *
 * Fetch data summary from MarginEdge.
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const syncService = new MarginEdgeSyncService(prisma);
    const summary = await syncService.getDataSummary();

    return NextResponse.json(summary);
  } catch (error) {
    return handleApiError(error, "MarginEdge sync error");
  }
}

/**
 * POST /api/marginedge/sync
 *
 * Trigger a full data fetch from MarginEdge.
 */
export async function POST() {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const syncService = new MarginEdgeSyncService(prisma);
    const result = await syncService.fetchAllData();

    return NextResponse.json({
      success: result.success,
      syncedAt: result.syncedAt,
      stats: result.stats,
      errors: result.errors,
    });
  } catch (error) {
    return handleApiError(error, "MarginEdge sync error");
  }
}
