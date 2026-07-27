import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/flutterwave";
import { sendEmail } from "@/lib/email";
import { customerOrderPaidEmail, sellerOrderPaidEmail } from "@/lib/email-templates";

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
