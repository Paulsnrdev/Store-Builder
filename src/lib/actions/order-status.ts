"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { customerOrderPaidEmail, sellerOrderPaidEmail } from "@/lib/email-templates";

export async function getOrderStatus(orderId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  return order?.status ?? null;
}

type ConfirmResult = { ok: true } | { ok: false; error: string };

/**
 * Called from the storefront checkout after Paystack's client-side widget
 * reports a successful payment against the seller's own account. There is no
 * secret key or webhook available to re-verify this server-side (the seller
 * only provides a public key) — this trusts the browser's report. The
 * `status !== "PENDING"` guard makes repeat calls a no-op rather than letting
 * this flip an already-resolved order, but it does not stop a buyer from
 * calling this directly without actually paying; that trade-off was a
 * deliberate product decision to avoid requiring sellers hand over a secret key.
 */
export async function confirmPaystackPayment(orderId: string, reference: string): Promise<ConfirmResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, store: true, customer: true },
  });
  if (!order || order.paymentMethod !== "PAYSTACK") return { ok: false, error: "Order not found." };
  if (order.status !== "PENDING") return { ok: true };

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID", paidAt: new Date(), paystackReference: reference },
    });
  } catch (err) {
    console.error("confirmPaystackPayment: failed to update order", err);
    return { ok: false, error: "Could not confirm payment. Please contact the seller." };
  }

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

  return { ok: true };
}
