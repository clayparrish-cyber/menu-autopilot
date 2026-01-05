// POST /tips/api/shifts/[id]/close - Close shift
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth, requireRole } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTipAuth();
    requireRole(ctx, ["ADMIN", "MANAGER"]);
    const { id } = await params;

    // Verify shift belongs to org
    const shift = await prisma.shift.findFirst({
      where: {
        id,
        location: { organizationId: ctx.organization.id },
      },
      include: {
        entries: {
          include: { allocations: true },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (shift.status === "CLOSED") {
      return NextResponse.json(
        { error: "Shift is already closed" },
        { status: 400 }
      );
    }

    // Check all entries are submitted
    const pendingEntries = shift.entries.filter((e) => e.status === "PENDING");
    if (pendingEntries.length > 0) {
      return NextResponse.json(
        {
          error: `${pendingEntries.length} entries not submitted`,
          pending: pendingEntries.map((e) => e.serverName),
        },
        { status: 400 }
      );
    }

    // Calculate total allocated
    const totalAllocated = shift.entries.reduce(
      (sum, e) => sum + e.actualTipOut,
      0
    );

    // Update shift status
    const updated = await prisma.shift.update({
      where: { id },
      data: {
        status: "CLOSED",
        totalAllocated,
      },
    });

    await audit.close(
      "Shift",
      id,
      {
        date: shift.shiftDate,
        entries: shift.entries.length,
        totalAllocated,
      },
      { userId: ctx.user.id }
    );

    return NextResponse.json({ shift: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }
    console.error("Close shift error:", error);
    return NextResponse.json(
      { error: "Failed to close shift" },
      { status: 500 }
    );
  }
}
