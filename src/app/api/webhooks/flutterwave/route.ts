import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/flutterwave";
import { sendEmail } from "@/lib/email";
import { customerOrderPaidEmail, sellerOrderPaidEmail, sellerSubscriptionActiveEmail } from "@/lib/email-templates";
import { addCycle, type Cycle } from "@/lib/billing-cycles";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("verif-hash");

  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.completed" || event.data?.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  const txRef: string | undefined = event.data?.tx_ref;
  const transactionId: string | undefined = event.data?.id?.toString();
  if (!txRef || !transactionId) return NextResponse.json({ received: true });

  // StoreHike plan subscription charges (self-serve upgrade or a recurring auto-renewal),
  // as opposed to a buyer paying for an order — handled entirely separately below.
  if (txRef.startsWith("SUB-") || event.data?.payment_plan) {
    await handleSubscriptionCharge(event.data, transactionId);
    return NextResponse.json({ received: true });
  }

  const order = await prisma.order.findFirst({
    where: { flutterwaveTxRef: txRef },
    include: { items: true, store: true, customer: true },
  });

  if (!order) {
    console.error(`Flutterwave webhook: no order found for tx_ref ${txRef}`);
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

/**
 * Activates or renews a StoreHike plan subscription off a successful Flutterwave charge.
 *
 * NOTE: the exact shape of `event.data.payment_plan` on a Flutterwave webhook payload —
 * and whether recurring auto-charges reuse or regenerate `tx_ref` — could not be verified
 * against a live payload from this environment. This follows Flutterwave's documented
 * Payment Plan behavior; confirm against a real test renewal before relying on it.
 */
async function handleSubscriptionCharge(data: Record<string, unknown>, transactionId: string) {
  const txRef = data.tx_ref as string;
  const paymentPlanId = data.payment_plan != null ? String(data.payment_plan) : undefined;
  const customerEmail = (data.customer as { email?: string } | undefined)?.email;

  // Idempotent: a replayed webhook delivery for a charge we've already logged is a no-op.
  const alreadyLogged = await prisma.subscriptionPayment.findUnique({ where: { txRef } });
  if (alreadyLogged) return;

  const verified = await verifyTransaction(transactionId);
  if (!verified || verified.status !== "successful") return;

  let subscription: Awaited<ReturnType<typeof prisma.subscription.update>> & {
    plan: { name: string };
    store: { name: string; email: string | null };
  };

  if (!paymentPlanId) return;

  const plan = await prisma.plan.findFirst({
    where: {
      OR: [
        { flutterwaveMonthlyPlanId: paymentPlanId },
        { flutterwaveBiannualPlanId: paymentPlanId },
        { flutterwaveAnnualPlanId: paymentPlanId },
      ],
    },
  });
  if (!plan) return;

  const interval = (
    plan.flutterwaveMonthlyPlanId === paymentPlanId ? "MONTHLY" : plan.flutterwaveBiannualPlanId === paymentPlanId ? "BIANNUAL" : "YEARLY"
  ) as Cycle;

  if (txRef.startsWith("SUB-")) {
    // Our own tx_ref (SUB-<storeId>-<timestamp>) — the first charge for a newly picked plan.
    const storeId = txRef.split("-")[1];
    subscription = await prisma.subscription.upsert({
      where: { storeId },
      update: { planId: plan.id, interval, status: "ACTIVE", currentPeriodEnd: addCycle(new Date(), interval), canceledAt: null },
      create: { storeId, planId: plan.id, interval, status: "ACTIVE", currentPeriodEnd: addCycle(new Date(), interval) },
      include: { plan: true, store: true },
    });
  } else {
    // A recurring auto-charge Flutterwave triggered on its own schedule — no tx_ref of ours
    // to key off, so match by which plan was charged and whose billing email it belongs to.
    if (!customerEmail) return;
    const existing = await prisma.subscription.findFirst({
      where: { planId: plan.id, store: { email: customerEmail } },
      include: { plan: true, store: true },
    });
    if (!existing) return;
    subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", currentPeriodEnd: addCycle(new Date(), existing.interval as Cycle), canceledAt: null },
      include: { plan: true, store: true },
    });
  }

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
