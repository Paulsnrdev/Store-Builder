import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/paystack";
import { sendEmail } from "@/lib/email";
import { customerOrderPaidEmail, sellerOrderPaidEmail } from "@/lib/email-templates";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference: string | undefined = event.data?.reference;
  if (!reference) return NextResponse.json({ received: true });

  const order = await prisma.order.findFirst({
    where: { paystackReference: reference },
    include: { items: true, store: true, customer: true },
  });

  if (!order) {
    console.error(`Paystack webhook: no order found for reference ${reference}`);
    return NextResponse.json({ received: true });
  }

  // Idempotent: only the first delivery of this event (order still PENDING) has any effect.
  // Replays of the same event find status already PAID and no-op.
  if (order.status !== "PENDING") {
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
