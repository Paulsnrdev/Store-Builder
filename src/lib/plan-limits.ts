import type { Plan, Subscription } from "@/generated/prisma/client";

// Matches the "Free" tier's advertised product cap on the marketing pricing
// page (src/components/marketing/pricing-section.tsx). Stores with no
// Subscription row at all — the default for every new signup — fall back to
// this rather than needing a "Free" row in the Plan table.
export const FREE_PRODUCT_LIMIT = 10;

type SubscriptionWithPlan = (Subscription & { plan: Plan }) | null;

/** Whether a store currently has paid-plan access (vs. having lapsed back to Free). */
export function isSubscriptionEntitled(subscription: SubscriptionWithPlan): boolean {
  if (!subscription) return false;
  if (subscription.status === "ACTIVE" || subscription.status === "TRIALING") return true;
  // Canceled but the paid-for period hasn't ended yet — standard grace period.
  if (subscription.status === "CANCELED" && subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date()) return true;
  return false;
}

/** null = unlimited. */
export function getProductLimit(subscription: SubscriptionWithPlan): number | null {
  if (!isSubscriptionEntitled(subscription)) return FREE_PRODUCT_LIMIT;
  return subscription!.plan.productLimit;
}
