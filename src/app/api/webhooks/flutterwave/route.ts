import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, verifyTransaction, FLUTTERWAVE_TX_PREFIX } from "@/lib/flutterwave";
import { sendEmail } from "@/lib/email";
import { customerOrderPaidEmail, sellerOrderPaidEmail, sellerSubscriptionActiveEmail } from "@/lib/email-templates";
import { addCycle, cycleAmount, type Cycle } from "@/lib/billing-cycles";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("verif-hash");

  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // A seller canceled their StoreHike plan from Flutterwave's own side (dashboard/support)
  // rather than through /dashboard/billing — reflect that here so we don't keep treating
  // them as an active paying subscriber.
  if (event.event === "subscription.cancelled") {
    await handleSubscriptionCancelledEvent(event.data ?? {});
    return NextResponse.json({ received: true });
  }

  if (event.event !== "charge.completed") {
    return NextResponse.json({ received: true });
  }

  const txRef: string | undefined = event.data?.tx_ref;
  const transactionId: string | undefined = event.data?.id?.toString();
  if (!txRef || !transactionId) return NextResponse.json({ received: true });

  // Flutterwave doesn't send a separate "charge.failed" event — a failed renewal comes
  // through as this same event with status "failed". Only subscription renewals need
  // action here; a failed buyer-order payment needs nothing (the order just stays
  // PENDING and the buyer retries checkout), so if this doesn't match a subscription
  // it's a silent no-op.
  if (event.data?.status === "failed") {
    await handleFailedSubscriptionCharge(event.data, transactionId);
    return NextResponse.json({ received: true });
  }

  if (event.data?.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  // Our own tx_ref for a seller's first charge on a newly picked StoreHike plan — see
  // subscribeToPlan in src/lib/actions/billing.ts. Everything needed to activate it is
  // embedded in the ref itself, so this never depends on the webhook echoing back which
  // Flutterwave payment plan the charge belongs to (it doesn't, reliably).
  if (txRef.startsWith(`${FLUTTERWAVE_TX_PREFIX}SUB_`)) {
    await handleNewSubscriptionCharge(event.data, transactionId);
    return NextResponse.json({ received: true });
  }

  const order = await prisma.order.findFirst({
    where: { flutterwaveTxRef: txRef },
    include: { items: true, store: true, customer: true },
  });

  if (!order) {
    // Not one of our orders and not our own subscription tx_ref format — this is most
    // likely a *recurring* auto-charge Flutterwave triggered on its own schedule for an
    // existing subscription, using a tx_ref it generated itself that we don't control.
    const handled = await handleRenewalCharge(event.data, transactionId);
    if (!handled) console.error(`Flutterwave webhook: no order or subscription found for tx_ref ${txRef}`);
    return NextResponse.json({ received: true });
  }

  // Idempotent: only the first delivery of this event (order still PENDING) has any effect.
  // Replays of the same event find status already PAID and no-op.
  if (order.status !== "PENDING") {
    return NextResponse.json({ received: true });
  }

  // The verif-hash header proves the request came from Flutterwave but isn't a payload
  // signature, so re-fetch the transaction from their API and confirm status/amount/
  // currency/reference match this order before trusting it — see lib/flutterwave.ts.
  const verified = await verifyTransaction(transactionId);
  if (
    !verified ||
    verified.status !== "successful" ||
    verified.txRef !== order.flutterwaveTxRef ||
    verified.amount < Number(order.total) ||
    verified.currency !== order.store.currency
  ) {
    console.error(`Flutterwave webhook: verification failed for order ${order.orderNumber}`);
    return NextResponse.json({ received: true });
  }

  await prisma.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() } });

  const emailData = {
    storeName: order.store.name,
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    total: Number(order.total),
    items: order.items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      quantity: i.quantity,
      total: Number(i.total),
    })),
  };

  if (order.store.email) {
    await sendEmail({ to: order.store.email, ...sellerOrderPaidEmail(emailData) });
  }
  if (order.customer.email) {
    await sendEmail({ to: order.customer.email, ...customerOrderPaidEmail(emailData) });
  }

  return NextResponse.json({ received: true });
}

function chargeCustomer(data: Record<string, unknown>): { id: string | undefined; email: string | undefined } {
  const customer = data.customer as { id?: number; email?: string } | undefined;
  return { id: customer?.id != null ? String(customer.id) : undefined, email: customer?.email };
}

async function logSubscriptionPaymentAndNotify(
  subscription: { id: string; currentPeriodEnd: Date | null; plan: { name: string }; store: { name: string; email: string | null } },
  txRef: string,
  verified: { amount: number; currency: string }
) {
  await prisma.subscriptionPayment.create({
    data: { subscriptionId: subscription.id, txRef, amount: verified.amount, currency: verified.currency, status: "successful" },
  });

  if (subscription.store.email) {
    await sendEmail({
      to: subscription.store.email,
      ...sellerSubscriptionActiveEmail({
        storeName: subscription.store.name,
        planName: subscription.plan.name,
        currentPeriodEnd: subscription.currentPeriodEnd,
      }),
    });
  }
}

/** The first charge for a plan a seller just picked on /dashboard/billing — tx_ref is SH-SUB_<storeId>_<planSlug>_<cycle>_<ts>. */
async function handleNewSubscriptionCharge(data: Record<string, unknown>, transactionId: string) {
  const txRef = data.tx_ref as string;

  // Idempotent: a replayed webhook delivery for a charge we've already logged is a no-op.
  if (await prisma.subscriptionPayment.findUnique({ where: { txRef } })) return;

  const verified = await verifyTransaction(transactionId);
  if (!verified || verified.status !== "successful") return;

  // Splitting on "_" skips index 0 (the "SH-SUB" prefix token) regardless of exactly what
  // it contains, so this is unaffected by the "SH-" routing prefix.
  const [, storeId, planSlug, cycleRaw] = txRef.split("_");
  const cycle = cycleRaw as Cycle;
  const { id: customerId } = chargeCustomer(data);

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) return;

  const subscription = await prisma.subscription.upsert({
    where: { storeId },
    update: {
      planId: plan.id,
      interval: cycle,
      status: "ACTIVE",
      currentPeriodEnd: addCycle(new Date(), cycle),
      canceledAt: null,
      flutterwaveCustomerId: customerId,
    },
    create: {
      storeId,
      planId: plan.id,
      interval: cycle,
      status: "ACTIVE",
      currentPeriodEnd: addCycle(new Date(), cycle),
      flutterwaveCustomerId: customerId,
    },
    include: { plan: true, store: true },
  });

  await logSubscriptionPaymentAndNotify(subscription, txRef, verified);
}

/**
 * A recurring auto-charge Flutterwave triggered on its own schedule, using a tx_ref we
 * don't control. Matched by Flutterwave's own customer ID (captured at first charge) with
 * an email fallback, then sanity-checked against the subscribed plan's price before being
 * trusted. Returns whether a matching subscription was found and updated.
 *
 * NOTE: this path could not be exercised against a real Flutterwave renewal from this
 * environment — verify with a real test subscription before relying on it in production.
 */
async function handleRenewalCharge(data: Record<string, unknown>, transactionId: string): Promise<boolean> {
  const txRef = data.tx_ref as string;
  const { id: customerId, email: customerEmail } = chargeCustomer(data);
  if (!customerId && !customerEmail) return false;

  if (await prisma.subscriptionPayment.findUnique({ where: { txRef } })) return true;

  const verified = await verifyTransaction(transactionId);
  if (!verified || verified.status !== "successful") return false;

  const existing = await prisma.subscription.findFirst({
    where: {
      OR: [...(customerId ? [{ flutterwaveCustomerId: customerId }] : []), ...(customerEmail ? [{ store: { email: customerEmail } }] : [])],
    },
    include: { plan: true, store: true },
  });
  if (!existing) return false;

  const expectedAmount = cycleAmount(Number(existing.plan.monthlyPrice), existing.interval as Cycle);
  // Allow some slack for rounding, but this should be close to what the plan+cycle costs.
  if (verified.amount < expectedAmount * 0.9) return false;

  const subscription = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: addCycle(new Date(), existing.interval as Cycle),
      canceledAt: null,
      flutterwaveCustomerId: customerId ?? existing.flutterwaveCustomerId,
    },
    include: { plan: true, store: true },
  });

  await logSubscriptionPaymentAndNotify(subscription, txRef, verified);
  return true;
}

/**
 * A renewal charge failed (declined card, insufficient funds, etc). Marks the matching
 * subscription PAST_DUE, which immediately reverts the store to Free's product limit
 * (see isSubscriptionEntitled in src/lib/plan-limits.ts) until a charge succeeds again —
 * no grace period. If this doesn't match a subscription it's a buyer-order payment
 * failing, which needs no action here (the order just stays PENDING).
 */
async function handleFailedSubscriptionCharge(data: Record<string, unknown>, transactionId: string) {
  const { id: customerId, email: customerEmail } = chargeCustomer(data);
  if (!customerId && !customerEmail) return;

  const verified = await verifyTransaction(transactionId);
  if (!verified || verified.status !== "failed") return;

  const existing = await prisma.subscription.findFirst({
    where: {
      status: "ACTIVE",
      OR: [...(customerId ? [{ flutterwaveCustomerId: customerId }] : []), ...(customerEmail ? [{ store: { email: customerEmail } }] : [])],
    },
  });
  if (!existing) return;

  await prisma.subscription.update({ where: { id: existing.id }, data: { status: "PAST_DUE" } });
}

/** Flutterwave's subscription.cancelled event — identifies the plan by data.plan.id and the customer by email. */
async function handleSubscriptionCancelledEvent(data: Record<string, unknown>) {
  const planId = (data.plan as { id?: number } | undefined)?.id?.toString();
  const customerEmail = (data.customer as { email?: string } | undefined)?.email;
  if (!planId) return;

  const plan = await prisma.plan.findFirst({
    where: {
      OR: [{ flutterwaveMonthlyPlanId: planId }, { flutterwaveBiannualPlanId: planId }, { flutterwaveAnnualPlanId: planId }],
    },
  });
  if (!plan) return;

  const existing = await prisma.subscription.findFirst({
    where: {
      planId: plan.id,
      status: { not: "CANCELED" },
      ...(customerEmail ? { store: { email: customerEmail } } : {}),
    },
  });
  if (!existing) return;

  await prisma.subscription.update({ where: { id: existing.id }, data: { status: "CANCELED", canceledAt: new Date() } });
}
