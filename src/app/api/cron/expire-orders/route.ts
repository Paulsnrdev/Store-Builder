import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { restoreStock } from "@/lib/inventory";
import { deactivateDedicatedVirtualAccount } from "@/lib/paystack";

/**
 * Sweeps pooled bank-transfer orders whose 30-minute Dedicated Virtual Account window closed
 * unpaid: releases the stock reserved at checkout and deactivates the now-dead account. Only
 * DVA orders have `expiresAt` set — the seller's own static bank-transfer flow doesn't use
 * this field at all, so it's untouched by this sweep.
 *
 * Triggered by a scheduled GitHub Actions workflow (see .github/workflows/expire-orders.yml)
 * rather than Vercel's own cron, which doesn't support minute-level schedules on the Hobby
 * plan — a 30-minute window needs finer granularity than that.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await prisma.order.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    include: { items: true },
  });

  for (const order of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        await restoreStock(tx, order.items);
        await tx.order.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
      });
      if (order.paystackDvaAccountId) await deactivateDedicatedVirtualAccount(order.paystackDvaAccountId);
    } catch (err) {
      console.error(`expire-orders: failed to expire order ${order.id}`, err);
    }
  }

  return NextResponse.json({ expired: expired.length });
}
