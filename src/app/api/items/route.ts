import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: session.user.accountId },
      include: { locations: true },
    });

    if (!account || account.locations.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const locationIds = account.locations.map((l) => l.id);

    const items = await prisma.item.findMany({
      where: { locationId: { in: locationIds } },
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
    console.error("Items fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items } = updateSchema.parse(body);

    // Verify items belong to user's locations
    const account = await prisma.account.findUnique({
      where: { id: session.user.accountId },
      include: { locations: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const locationIds = new Set(account.locations.map((l) => l.id));

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

    console.error("Items update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
