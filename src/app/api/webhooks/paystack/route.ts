import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, verifyTransaction, deactivateDedicatedVirtualAccount, PAYSTACK_TX_PREFIX } from "@/lib/paystack";
import { creditStoreLedger } from "@/lib/ledger";
import { sendEmail } from "@/lib/email";
import {
  sellerSubscriptionActiveEmail,
  sellerSubscriptionPastDueEmail,
  sellerOrderPaidEmail,
  customerOrderPaidEmail,
} from "@/lib/email-templates";
import { addCycle, cycleAmount, type Cycle } from "@/lib/billing-cycles";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // A seller canceled their StoreHike plan from Paystack's own side (dashboard/support)
  // rather than through /dashboard/billing — reflect that here so we don't keep treating
  // them as an active paying subscriber.
  if (event.event === "subscription.disable") {
    await handleSubscriptionDisabledEvent(event.data ?? {});
    return NextResponse.json({ received: true });
  }

  // A renewal charge failed (declined card, insufficient funds, etc). Paystack reports
  // this as its own event rather than a "failed" status on charge.success.
  if (event.event === "invoice.payment_failed") {
    await handleFailedSubscriptionCharge(event.data ?? {});
    return NextResponse.json({ received: true });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference: string | undefined = event.data?.reference;
  if (!reference) return NextResponse.json({ received: true });

  // Buyer order paid into a pooled Dedicated Virtual Account (seller has no Paystack account
  // of their own — see createOrderVirtualAccount in src/lib/paystack.ts). Checked first: these
  // use Paystack-generated customer codes tied to a one-time order, which never collide with
  // a StoreHike subscription's reference/customer, so there's no ambiguity with the branches
  // below.
  if (await handleDedicatedAccountCharge(event.data, reference)) {
    return NextResponse.json({ received: true });
  }

  // Our own reference for a seller's first charge on a newly picked StoreHike plan — see
  // subscribeToPlan in src/lib/actions/billing.ts. Everything needed to activate it is
  // embedded in the reference itself, so this never depends on the webhook echoing back
  // which Paystack plan the charge belongs to.
  if (reference.startsWith(`${PAYSTACK_TX_PREFIX}SUB_`)) {
    await handleNewSubscriptionCharge(event.data, reference);
    return NextResponse.json({ received: true });
  }

  // Anything else at this point is a *recurring* auto-charge Paystack triggered on its own
  // schedule for an existing subscription, using a reference it generated itself that we
  // don't control. Buyer orders never go through this webhook at all — each seller's own
  // Paystack account handles and confirms those independently of the platform.
  const handled = await handleRenewalCharge(event.data, reference);
  if (!handled) console.error(`Paystack webhook: no subscription found for reference ${reference}`);
  return NextResponse.json({ received: true });
}

/**
 * A buyer's payment into a pooled Dedicated Virtual Account. Matched back to its order via
 * the customer_code stashed on the order at checkout time — not by reference, since Paystack
 * generates its own reference for these and we don't control it. Returns whether this event
 * was actually a DVA payment (so the caller knows whether to fall through to subscription
 * handling), not whether it succeeded.
 */
async function handleDedicatedAccountCharge(data: Record<string, unknown>, reference: string): Promise<boolean> {
  const { code: customerCode } = chargeCustomer(data);
  if (!customerCode) return false;

  const order = await prisma.order.findFirst({
    where: { paystackDvaCustomerCode: customerCode, status: "PENDING" },
    include: { items: true, store: true, customer: true },
  });
  if (!order) return false;

  const verified = await verifyTransaction(reference);
  if (!verified || verified.status !== "success") return true;

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID", paidAt: new Date(), paystackReference: reference },
  });

  const creditResult = await creditStoreLedger({ storeId: order.storeId, orderId: order.id, amount: verified.amount, reference });
  if (!creditResult.ok) console.error(`Paystack webhook: failed to credit ledger for order ${order.id}: ${creditResult.error}`);

  if (order.paystackDvaAccountId) await deactivateDedicatedVirtualAccount(order.paystackDvaAccountId);

  const emailData = {
    storeName: order.store.name,
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    total: Number(order.total),
    items: order.items.map((i) => ({ productName: i.productName, variantName: i.variantName, quantity: i.quantity, total: Number(i.total) })),
  };
  if (order.store.email) await sendEmail({ to: order.store.email, ...sellerOrderPaidEmail(emailData) });
  if (order.customer.email) await sendEmail({ to: order.customer.email, ...customerOrderPaidEmail(emailData) });

  return true;
}

function chargeCustomer(data: Record<string, unknown>): { code: string | undefined; email: string | undefined } {
  const customer = data.customer as { customer_code?: string; email?: string } | undefined;
  return { code: customer?.customer_code, email: customer?.email };
}

async function logSubscriptionPaymentAndNotify(
  subscription: { id: string; currentPeriodEnd: Date | null; plan: { name: string }; store: { name: string; email: string | null } },
  reference: string,
  verified: { amount: number; currency: string }
) {
  await prisma.subscriptionPayment.create({
    data: { subscriptionId: subscription.id, txRef: reference, amount: verified.amount, currency: verified.currency, status: "successful" },
  });

  if (subscription.store.email) {
    await sendEmail({
      to: subscription.store.email,
      ...sellerSubscriptionActiveEmail({
        storeName: subscription.store.name,
        planName: subscription.plan.name,
        currentPeriodEnd: subscription.currentPeriodEnd,
        billingUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing`,
      }),
    });
  }
}

/** The first charge for a plan a seller just picked on /dashboard/billing — reference is SH-SUB_<storeId>_<planSlug>_<cycle>_<ts>. */
async function handleNewSubscriptionCharge(data: Record<string, unknown>, reference: string) {
  // Idempotent: a replayed webhook delivery for a charge we've already logged is a no-op.
  if (await prisma.subscriptionPayment.findUnique({ where: { txRef: reference } })) return;

  const verified = await verifyTransaction(reference);
  if (!verified || verified.status !== "success") return;

  // Splitting on "_" skips index 0 (the "SH-SUB" prefix token) regardless of exactly what
  // it contains, so this is unaffected by the "SH-" routing prefix.
  const [, storeId, planSlug, cycleRaw] = reference.split("_");
  const cycle = cycleRaw as Cycle;
  const { code: customerCode } = chargeCustomer(data);

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
      paystackCustomerCode: customerCode,
    },
    create: {
      storeId,
      planId: plan.id,
      interval: cycle,
      status: "ACTIVE",
      currentPeriodEnd: addCycle(new Date(), cycle),
      paystackCustomerCode: customerCode,
    },
    include: { plan: true, store: true },
  });

  await logSubscriptionPaymentAndNotify(subscription, reference, verified);
}

/**
 * A recurring auto-charge Paystack triggered on its own schedule, using a reference we
 * don't control. Matched by Paystack's own customer code (captured at first charge) with
 * an email fallback, then sanity-checked against the subscribed plan's price before being
 * trusted. Returns whether a matching subscription was found and updated.
 *
 * NOTE: this path could not be exercised against a real Paystack renewal from this
 * environment — verify with a real test subscription before relying on it in production.
 */
async function handleRenewalCharge(data: Record<string, unknown>, reference: string): Promise<boolean> {
  const { code: customerCode, email: customerEmail } = chargeCustomer(data);
  if (!customerCode && !customerEmail) return false;

  if (await prisma.subscriptionPayment.findUnique({ where: { txRef: reference } })) return true;

  const verified = await verifyTransaction(reference);
  if (!verified || verified.status !== "success") return false;

  const existing = await prisma.subscription.findFirst({
    where: {
      OR: [...(customerCode ? [{ paystackCustomerCode: customerCode }] : []), ...(customerEmail ? [{ store: { email: customerEmail } }] : [])],
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
      paystackCustomerCode: customerCode ?? existing.paystackCustomerCode,
    },
    include: { plan: true, store: true },
  });

  await logSubscriptionPaymentAndNotify(subscription, reference, verified);
  return true;
}

/**
 * A renewal charge failed (declined card, insufficient funds, etc). Marks the matching
 * subscription PAST_DUE, which immediately reverts the store to Free's product limit
 * (see isSubscriptionEntitled in src/lib/plan-limits.ts) until a charge succeeds again —
 * no grace period.
 *
 * NOTE: this path could not be exercised against a real Paystack invoice.payment_failed
 * event from this environment — the exact payload shape (customer/subscription nesting)
 * should be confirmed against a real test event before relying on it in production.
 */
async function handleFailedSubscriptionCharge(data: Record<string, unknown>) {
  const subscriptionData = data.subscription as { customer?: { customer_code?: string; email?: string } } | undefined;
  const customer = (data.customer ?? subscriptionData?.customer) as { customer_code?: string; email?: string } | undefined;
  const customerCode = customer?.customer_code;
  const customerEmail = customer?.email;
  if (!customerCode && !customerEmail) return;

  const existing = await prisma.subscription.findFirst({
    where: {
      status: "ACTIVE",
      OR: [...(customerCode ? [{ paystackCustomerCode: customerCode }] : []), ...(customerEmail ? [{ store: { email: customerEmail } }] : [])],
    },
    include: { plan: true, store: true },
  });
  if (!existing) return;

  await prisma.subscription.update({ where: { id: existing.id }, data: { status: "PAST_DUE" } });

  if (existing.store.email) {
    await sendEmail({
      to: existing.store.email,
      ...sellerSubscriptionPastDueEmail({
        storeName: existing.store.name,
        planName: existing.plan.name,
        billingUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing`,
      }),
    });
  }
}

/** Paystack's subscription.disable event — identifies the plan by data.plan.plan_code and the customer by email. */
async function handleSubscriptionDisabledEvent(data: Record<string, unknown>) {
  const planCode = (data.plan as { plan_code?: string } | undefined)?.plan_code;
  const customerEmail = (data.customer as { email?: string } | undefined)?.email;
  if (!planCode) return;

  const plan = await prisma.plan.findFirst({
    where: {
      OR: [
        { paystackMonthlyPlanCode: planCode },
        { paystackBiannualPlanCode: planCode },
        { paystackAnnualPlanCode: planCode },
      ],
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
