"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreOwner } from "@/lib/store";
import {
  createPaymentPlan,
  initializeTransaction,
  findActivePaystackSubscription,
  cancelPaystackSubscription,
  PAYSTACK_TX_PREFIX,
} from "@/lib/paystack";
import { sendEmail } from "@/lib/email";
import { sellerSubscriptionCanceledEmail } from "@/lib/email-templates";
import { cycleAmount, PAYSTACK_INTERVAL, type Cycle } from "@/lib/billing-cycles";
import type { Plan } from "@/generated/prisma/client";

type SubscribeResult = { ok: true; paymentLink: string } | { ok: false; error: string };

const PAYSTACK_PLAN_COLUMN = {
  MONTHLY: "paystackMonthlyPlanCode",
  BIANNUAL: "paystackBiannualPlanCode",
  YEARLY: "paystackAnnualPlanCode",
} as const;

async function getOrCreatePaystackPlanCode(plan: Plan, cycle: Cycle): Promise<{ ok: true; planCode: string } | { ok: false; error: string }> {
  const column = PAYSTACK_PLAN_COLUMN[cycle];
  const existing = plan[column];
  if (existing) return { ok: true, planCode: existing };

  const amount = cycleAmount(Number(plan.monthlyPrice), cycle);
  const result = await createPaymentPlan({
    name: `StoreHike ${plan.name} (${cycle.toLowerCase()})`,
    amount,
    interval: PAYSTACK_INTERVAL[cycle],
    currency: plan.currency,
  });
  if (!result.ok) return result;

  await prisma.plan.update({ where: { id: plan.id }, data: { [column]: result.planCode } });
  return { ok: true, planCode: result.planCode };
}

export async function subscribeToPlan(planSlug: string, cycle: Cycle): Promise<SubscribeResult> {
  const store = await requireStoreOwner();

  if (!store.email) {
    return { ok: false, error: "Add a store email in Settings first — Paystack needs one to bill you." };
  }

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan || !plan.isActive) return { ok: false, error: "That plan isn't available right now." };

  const planCodeResult = await getOrCreatePaystackPlanCode(plan, cycle);
  if (!planCodeResult.ok) return planCodeResult;

  const amount = cycleAmount(Number(plan.monthlyPrice), cycle);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  // Paystack's charge.success webhook doesn't reliably echo back which plan a charge
  // belongs to, so we can't rely on that to activate the subscription. Instead we embed
  // everything the webhook needs directly in our own reference: storeId, plan slug, and
  // cycle. storeId (cuid) and slug (kebab-case) never contain "_", so splitting on it is
  // unambiguous. See handleNewSubscriptionCharge in the webhook route.
  const reference = `${PAYSTACK_TX_PREFIX}SUB_${store.id}_${plan.slug}_${cycle}_${Date.now()}`;

  const result = await initializeTransaction({
    email: store.email,
    amount,
    currency: plan.currency,
    reference,
    callbackUrl: `${appUrl}/dashboard/billing`,
    planCode: planCodeResult.planCode,
  });

  if (!result.ok) return result;
  return { ok: true, paymentLink: result.paymentLink };
}

export async function cancelSubscription(): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await requireStoreOwner();
  const subscription = store.subscription;
  if (!subscription) return { ok: false, error: "No active subscription to cancel." };

  const paystackPlanCode = subscription.plan[PAYSTACK_PLAN_COLUMN[subscription.interval as Cycle]];
  if (paystackPlanCode && store.email) {
    const paystackSubscription = await findActivePaystackSubscription(paystackPlanCode, store.email);
    if (paystackSubscription) {
      await cancelPaystackSubscription(paystackSubscription.subscription_code, paystackSubscription.email_token);
    }
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELED", canceledAt: new Date() },
  });

  if (store.email) {
    await sendEmail({
      to: store.email,
      ...sellerSubscriptionCanceledEmail({
        storeName: store.name,
        planName: subscription.plan.name,
        accessUntil: subscription.currentPeriodEnd,
      }),
    });
  }

  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getSubscriptionStatus(): Promise<string | null> {
  const store = await requireStoreOwner();
  return store.subscription?.status ?? null;
}
