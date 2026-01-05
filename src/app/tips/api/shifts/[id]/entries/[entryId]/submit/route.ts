// POST /tips/api/shifts/[id]/entries/[entryId]/submit - Submit entry
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const ctx = await requireTipAuth();
    const { id: shiftId, entryId } = await params;

    // Verify entry belongs to org and is in PENDING status
    const entry = await prisma.shiftEntry.findFirst({
      where: {
        id: entryId,
        shiftId,
        shift: {
          location: { organizationId: ctx.organization.id },
          status: { not: "CLOSED" },
        },
      },
      include: {
        allocations: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found or shift is closed" },
        { status: 404 }
      );
    }

    if (entry.status !== "PENDING") {
      return NextResponse.json(
        { error: "Entry already submitted" },
        { status: 400 }
      );
    }

    if (entry.allocations.length === 0) {
      return NextResponse.json(
        { error: "Must have at least one allocation to submit" },
        { status: 400 }
      );
    }

    // Update entry status
    const updated = await prisma.shiftEntry.update({
      where: { id: entryId },
      data: { status: "SUBMITTED" },
    });

    // Update shift status to IN_PROGRESS if it was OPEN
    await prisma.shift.updateMany({
      where: { id: shiftId, status: "OPEN" },
      data: { status: "IN_PROGRESS" },
    });

    await audit.submit(
      "ShiftEntry",
      entryId,
      {
        serverName: entry.serverName,
        totalTips: entry.totalTips,
        allocations: entry.allocations.length,
        tipOut: entry.actualTipOut,
      },
      { userId: ctx.user.id }
    );

    return NextResponse.json({ entry: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Submit entry error:", error);
    return NextResponse.json(
      { error: "Failed to submit entry" },
      { status: 500 }
    );
  }
}
