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
      select: {
        targetFoodCostPct: true,
        minQtyThreshold: true,
        popularityThreshold: true,
        marginThreshold: true,
        allowPremiumPricing: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const settingsSchema = z.object({
  targetFoodCostPct: z.number().min(1).max(100),
  minQtyThreshold: z.number().min(1),
  popularityThreshold: z.number().min(1).max(99),
  marginThreshold: z.number().min(1).max(99),
  allowPremiumPricing: z.boolean(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = settingsSchema.parse(body);

    await prisma.account.update({
      where: { id: session.user.accountId },
      data: {
        targetFoodCostPct: data.targetFoodCostPct,
        minQtyThreshold: data.minQtyThreshold,
        popularityThreshold: data.popularityThreshold,
        marginThreshold: data.marginThreshold,
        allowPremiumPricing: data.allowPremiumPricing,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
