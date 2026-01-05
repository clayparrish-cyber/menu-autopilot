import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe, TIER_FROM_PRICE } from "@/lib/stripe";
import Stripe from "stripe";
import { SubscriptionTier } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const accountId = session.metadata?.accountId;
        const planId = session.metadata?.planId;

        if (accountId && planId && session.subscription) {
          await prisma.account.update({
            where: { id: accountId },
            data: {
              stripeSubscriptionId: session.subscription as string,
              subscriptionTier: planId as SubscriptionTier,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const account = await prisma.account.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (account) {
          const priceId = subscription.items.data[0]?.price.id;
          const tier = TIER_FROM_PRICE[priceId] as SubscriptionTier || "SOLO";

          const periodEnd = (subscription as { current_period_end?: number }).current_period_end;
          await prisma.account.update({
            where: { id: account.id },
            data: {
              stripeSubscriptionId: subscription.id,
              stripePriceId: priceId,
              subscriptionTier: tier,
              stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const account = await prisma.account.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (account) {
          await prisma.account.update({
            where: { id: account.id },
            data: {
              stripeSubscriptionId: null,
              stripePriceId: null,
              subscriptionTier: "NONE",
              stripeCurrentPeriodEnd: null,
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Could send email notification here
        console.log(`Payment failed for customer: ${customerId}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
