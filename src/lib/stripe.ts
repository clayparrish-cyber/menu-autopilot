import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export const PRICE_IDS: Record<string, string> = {
  SOLO: process.env.STRIPE_PRICE_SOLO || "price_solo",
  TEAM: process.env.STRIPE_PRICE_TEAM || "price_team",
  GROUP: process.env.STRIPE_PRICE_GROUP || "price_group",
};

export const TIER_FROM_PRICE: Record<string, string> = Object.fromEntries(
  Object.entries(PRICE_IDS).map(([tier, price]) => [price, tier])
);
