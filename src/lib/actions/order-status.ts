"use server";

import { prisma } from "@/lib/prisma";

export async function getOrderStatus(orderId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  return order?.status ?? null;
}
