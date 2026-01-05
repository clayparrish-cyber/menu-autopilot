import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext, handleApiError } from "@/lib/api";
import { z } from "zod";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    if (ctx.locationIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const items = await prisma.item.findMany({
      where: { locationId: { in: ctx.locationIds } },
      include: {
        costOverrides: {
          orderBy: { effectiveDate: "desc" },
          take: 1,
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const formattedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      isAnchor: item.isAnchor,
      unitFoodCost: item.costOverrides[0]?.unitFoodCost || null,
    }));

    return NextResponse.json({ items: formattedItems });
  } catch (error) {
    return handleApiError(error, "Items fetch error");
  }
}

const updateSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      unitFoodCost: z.number().nullable(),
      isAnchor: z.boolean(),
    })
  ),
});

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const body = await req.json();
    const { items } = updateSchema.parse(body);

    const locationIds = new Set(ctx.locationIds);

    // Process updates in transaction
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        // Verify ownership
        const existingItem = await tx.item.findUnique({
          where: { id: item.id },
        });

        if (!existingItem || !locationIds.has(existingItem.locationId)) {
          continue; // Skip items that don't belong to user
        }

        // Update anchor status
        await tx.item.update({
          where: { id: item.id },
          data: { isAnchor: item.isAnchor },
        });

        // Update or create cost override
        if (item.unitFoodCost !== null) {
          await tx.costOverride.create({
            data: {
              itemId: item.id,
              unitFoodCost: item.unitFoodCost,
              effectiveDate: new Date(),
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return handleApiError(error, "Items update error");
  }
}
