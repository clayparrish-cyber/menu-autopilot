import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, errorResponse } from "@/lib/api";
import { z } from "zod";

const onboardingSchema = z.object({
  accountName: z.string().min(1),
  locationName: z.string().min(1),
  locationAddress: z.string().optional(),
  targetFoodCostPct: z.number().min(1).max(100).default(30),
  minQtyThreshold: z.number().min(1).default(10),
  popularityThreshold: z.number().min(1).max(99).default(60),
  marginThreshold: z.number().min(1).max(99).default(60),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const data = onboardingSchema.parse(body);

    // Check if user already has an account
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { ownedAccount: true, memberOf: true },
    });

    if (existingUser?.ownedAccount || existingUser?.memberOf) {
      return errorResponse("Account already exists", 400);
    }

    // Create account with location in a transaction
    const account = await prisma.$transaction(async (tx) => {
      // Create the account
      const newAccount = await tx.account.create({
        data: {
          name: data.accountName,
          ownerId: session.user.id,
          targetFoodCostPct: data.targetFoodCostPct,
          minQtyThreshold: data.minQtyThreshold,
          popularityThreshold: data.popularityThreshold,
          marginThreshold: data.marginThreshold,
          subscriptionTier: "NONE",
        },
      });

      // Create the first location
      await tx.location.create({
        data: {
          name: data.locationName,
          address: data.locationAddress || null,
          accountId: newAccount.id,
        },
      });

      return newAccount;
    });

    return NextResponse.json({ success: true, accountId: account.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return handleApiError(error, "Onboarding error");
  }
}
