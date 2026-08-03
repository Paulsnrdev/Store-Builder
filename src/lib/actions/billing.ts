"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import {
  createPaymentPlan,
  initializeTransaction,
  findActiveFlutterwaveSubscription,
  cancelFlutterwaveSubscription,
} from "@/lib/flutterwave";
import { sendEmail } from "@/lib/email";
import { sellerSubscriptionCanceledEmail } from "@/lib/email-templates";
import { cycleAmount, FLUTTERWAVE_INTERVAL, type Cycle } from "@/lib/billing-cycles";
import type { Plan } from "@/generated/prisma/client";

type SubscribeResult = { ok: true; paymentLink: string } | { ok: false; error: string };

const FLUTTERWAVE_PLAN_COLUMN = {
  MONTHLY: "flutterwaveMonthlyPlanId",
  BIANNUAL: "flutterwaveBiannualPlanId",
  YEARLY: "flutterwaveAnnualPlanId",
} as const;

async function getOrCreateFlutterwavePlanId(plan: Plan, cycle: Cycle): Promise<{ ok: true; planId: string } | { ok: false; error: string }> {
  const column = FLUTTERWAVE_PLAN_COLUMN[cycle];
  const existing = plan[column];
  if (existing) return { ok: true, planId: existing };

  const amount = cycleAmount(Number(plan.monthlyPrice), cycle);
  const result = await createPaymentPlan({
    name: `StoreHike ${plan.name} (${cycle.toLowerCase()})`,
    amount,
    interval: FLUTTERWAVE_INTERVAL[cycle],
    currency: plan.currency,
  });
  if (!result.ok) return result;

  await prisma.plan.update({ where: { id: plan.id }, data: { [column]: result.planId } });
  return { ok: true, planId: result.planId };
}

export async function subscribeToPlan(planSlug: string, cycle: Cycle): Promise<SubscribeResult> {
  const store = await getCurrentStore();

  if (!store.email) {
    return { ok: false, error: "Add a store email in Settings first — Flutterwave needs one to bill you." };
  }

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan || !plan.isActive) return { ok: false, error: "That plan isn't available right now." };

  const planIdResult = await getOrCreateFlutterwavePlanId(plan, cycle);
  if (!planIdResult.ok) return planIdResult;

  const amount = cycleAmount(Number(plan.monthlyPrice), cycle);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  // Prefixed so the webhook can recognize this as a subscription charge (vs. a buyer order)
  // and pull the storeId straight out of it for the very first charge on a new plan pick.
  const txRef = `SUB-${store.id}-${Date.now()}`;

  const result = await initializeTransaction({
    email: store.email,
    name: store.name,
    phone: store.phone || "",
    amount,
    currency: plan.currency,
    txRef,
    redirectUrl: `${appUrl}/dashboard/billing`,
    storeName: store.name,
    paymentPlanId: planIdResult.planId,
  });

  if (!result.ok) return result;
  return { ok: true, paymentLink: result.paymentLink };
}

export async function cancelSubscription(): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await getCurrentStore();
  const subscription = store.subscription;
  if (!subscription) return { ok: false, error: "No active subscription to cancel." };

  const flutterwavePlanId = subscription.plan[FLUTTERWAVE_PLAN_COLUMN[subscription.interval as Cycle]];
  if (flutterwavePlanId && store.email) {
    const fwSubscription = await findActiveFlutterwaveSubscription(flutterwavePlanId, store.email);
    if (fwSubscription) await cancelFlutterwaveSubscription(fwSubscription.id);
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
  const store = await getCurrentStore();
  return store.subscription?.status ?? null;
}
