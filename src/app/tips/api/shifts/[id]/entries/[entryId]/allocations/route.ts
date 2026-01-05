// POST /tips/api/shifts/[id]/entries/[entryId]/allocations - Add allocation
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";
import { z } from "zod";

const createAllocationSchema = z.object({
  recipientName: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const ctx = await requireTipAuth();
    const { id: shiftId, entryId } = await params;

    const body = await req.json();
    const data = createAllocationSchema.parse(body);

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

    // Try to link to existing staff
    const staff = await prisma.tipStaff.findFirst({
      where: {
        name: { equals: data.recipientName, mode: "insensitive" },
        location: { organizationId: ctx.organization.id },
        isActive: true,
      },
    });

    // Create allocation
    const allocation = await prisma.tipAllocation.create({
      data: {
        entryId,
        recipientName: data.recipientName,
        recipientStaffId: staff?.id,
        amount: data.amount,
        notes: data.notes,
      },
    });

    // Update entry's actualTipOut
    const newTipOut = entry.actualTipOut + data.amount;
    await prisma.shiftEntry.update({
      where: { id: entryId },
      data: {
        actualTipOut: newTipOut,
        netTips: entry.totalTips - newTipOut,
      },
    });

    await audit.create(
      "TipAllocation",
      allocation.id,
      {
        entryId,
        recipientName: data.recipientName,
        amount: data.amount,
      },
      { userId: ctx.user.id }
    );

    return NextResponse.json({ allocation }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Create allocation error:", error);
    return NextResponse.json(
      { error: "Failed to create allocation" },
      { status: 500 }
    );
  }
}
