import type { Plan, Subscription } from "@/generated/prisma/client";
import { isSubscriptionEntitled } from "@/lib/plan-limits";

// Matches the tiers on the marketing pricing page (Free=0 implicit, Lite=1,
// Basic=2, Growth=3, Business=4) — kept as named constants so gating checks
// read as "requires Basic+" rather than a bare number.
export const TIER = { FREE: 0, LITE: 1, BASIC: 2, GROWTH: 3, BUSINESS: 4 } as const;

// Each gated feature's minimum required tier, matching the marketing pricing page.
export const FEATURE_TIER = {
  CARD_PAYMENTS: TIER.LITE,
  WHATSAPP_MESSAGING: TIER.LITE,
  PRODUCT_VARIANTS: TIER.BASIC,
  THEME_CUSTOMIZATION: TIER.BASIC,
  PRINTABLE_INVOICES: TIER.BASIC,
  SHIPPING_ZONES: TIER.BASIC,
  CSV_EXPORT: TIER.GROWTH,
  CART_SYNC: TIER.GROWTH,
  DISCOUNT_CODES: TIER.GROWTH,
  STAFF_ACCOUNTS: TIER.BUSINESS,
  ANALYTICS_DASHBOARD: TIER.BUSINESS,
  CUSTOM_DOMAIN: TIER.BUSINESS,
} as const;

type SubscriptionWithPlan = (Subscription & { plan: Plan }) | null;

export function getFeatureTier(subscription: SubscriptionWithPlan): number {
  if (!isSubscriptionEntitled(subscription)) return TIER.FREE;
  return subscription!.plan.featureTier;
}

export function hasFeature(subscription: SubscriptionWithPlan, feature: keyof typeof FEATURE_TIER): boolean {
  return getFeatureTier(subscription) >= FEATURE_TIER[feature];
}
