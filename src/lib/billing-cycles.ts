// Shared between the marketing pricing page and the real billing/subscription
// code so the price a seller sees always matches what they're actually charged.

export type Cycle = "MONTHLY" | "BIANNUAL" | "YEARLY";

export const CYCLE_LABEL: Record<Cycle, string> = {
  MONTHLY: "Monthly",
  BIANNUAL: "Bi-Annually",
  YEARLY: "Yearly",
};

// Discretionary discount off the monthly rate for committing longer — a common
// SaaS convention (~10% for a half-year commitment, ~20% for a full year).
export const CYCLE_DISCOUNT: Record<Cycle, number> = { MONTHLY: 0, BIANNUAL: 0.1, YEARLY: 0.2 };
export const CYCLE_MONTHS: Record<Cycle, number> = { MONTHLY: 1, BIANNUAL: 6, YEARLY: 12 };

// Paystack's Plan `interval` field — confirmed against their current API docs
// (paystack.com/docs/payments/subscriptions): a 6-month cycle is "biannually"
// (no hyphen), and a 12-month cycle is "annually", not "yearly".
export const PAYSTACK_INTERVAL: Record<Cycle, string> = {
  MONTHLY: "monthly",
  BIANNUAL: "biannually",
  YEARLY: "annually",
};

/** Total amount billed for one full cycle, given the plan's monthly rate. */
export function cycleAmount(monthlyPrice: number, cycle: Cycle): number {
  return Math.round(monthlyPrice * (1 - CYCLE_DISCOUNT[cycle]) * CYCLE_MONTHS[cycle]);
}

export function addCycle(date: Date, cycle: Cycle): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + CYCLE_MONTHS[cycle]);
  return next;
}
