import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { getAuth, handleApiError, errorResponse } from "@/lib/api";
import { z } from "zod";

const checkoutSchema = z.object({
  planId: z.enum(["SOLO", "TEAM", "GROUP"]),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { planId } = checkoutSchema.parse(body);

    const account = await prisma.account.findUnique({
      where: { id: auth.accountId },
      include: { owner: true },
    });

    if (!account) {
      return errorResponse("Account not found", 404);
    }

    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      return errorResponse("Invalid plan", 400);
    }

    // Get or create Stripe customer
    let customerId = account.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: account.owner?.email || auth.email,
        metadata: { accountId: account.id },
      });
      customerId = customer.id;

      await prisma.account.update({
        where: { id: account.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/billing?canceled=true`,
      metadata: { accountId: account.id, planId },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return handleApiError(error, "Checkout error");
  }
}
