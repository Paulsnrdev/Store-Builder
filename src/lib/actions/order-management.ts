"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { restoreStock } from "@/lib/inventory";

type ActionResult = { ok: true } | { ok: false; error: string };

async function loadOwnedOrder(orderId: string, storeId: string) {
  return prisma.order.findFirst({ where: { id: orderId, storeId }, include: { items: true } });
}

function revalidateOrder(orderId: string) {
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
}

/** Bank transfer / cash on delivery orders only — Flutterwave orders are confirmed exclusively by the webhook. */
export async function markOrderPaid(orderId: string): Promise<ActionResult> {
  const store = await getCurrentStore();
  const order = await loadOwnedOrder(orderId, store.id);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentMethod === "FLUTTERWAVE") return { ok: false, error: "Flutterwave orders are confirmed automatically." };
  if (order.status !== "PENDING") return { ok: false, error: "Only pending orders can be marked as paid." };

  await prisma.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() } });
  revalidateOrder(orderId);
  return { ok: true };
}

export async function markOrderProcessing(orderId: string): Promise<ActionResult> {
  const store = await getCurrentStore();
  const order = await loadOwnedOrder(orderId, store.id);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "PAID") return { ok: false, error: "Only paid orders can move to processing." };

  await prisma.order.update({ where: { id: order.id }, data: { status: "PROCESSING" } });
  revalidateOrder(orderId);
  return { ok: true };
}

export async function markOrderShipped(orderId: string, trackingNote?: string): Promise<ActionResult> {
  const store = await getCurrentStore();
  const order = await loadOwnedOrder(orderId, store.id);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "PROCESSING" && order.status !== "PAID") {
    return { ok: false, error: "Only paid or processing orders can be marked as shipped." };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "SHIPPED", shippedAt: new Date(), trackingNote: trackingNote?.trim() || null },
  });
  revalidateOrder(orderId);
  return { ok: true };
}

export async function markOrderDelivered(orderId: string): Promise<ActionResult> {
  const store = await getCurrentStore();
  const order = await loadOwnedOrder(orderId, store.id);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "SHIPPED") return { ok: false, error: "Only shipped orders can be marked as delivered." };

  await prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
  revalidateOrder(orderId);
  return { ok: true };
}

/** Restores reserved stock — allowed any time before the order is delivered or already cancelled/refunded. */
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const store = await getCurrentStore();
  const order = await loadOwnedOrder(orderId, store.id);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "DELIVERED" || order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { ok: false, error: `Cannot cancel an order that is already ${order.status.toLowerCase()}.` };
  }

  await prisma.$transaction(async (tx) => {
    await restoreStock(tx, order.items);
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  });
  revalidateOrder(orderId);
  return { ok: true };
}

/** For paid orders after the fact (e.g. a delivered or shipped order the customer returned). Also restores stock. */
export async function refundOrder(orderId: string): Promise<ActionResult> {
  const store = await getCurrentStore();
  const order = await loadOwnedOrder(orderId, store.id);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "PENDING" || order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { ok: false, error: `Cannot refund an order that is ${order.status.toLowerCase()}.` };
  }

  await prisma.$transaction(async (tx) => {
    await restoreStock(tx, order.items);
    await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
  });
  revalidateOrder(orderId);
  return { ok: true };
}
