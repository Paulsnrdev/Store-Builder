import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { restoreStock } from "@/lib/inventory";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Releases stock reserved by auto-generated bank transfer orders whose virtual
 * account has expired unpaid. Runs on a schedule (see .github/workflows) rather
 * than Vercel Cron, since Hobby-tier projects only get daily cron runs.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidates = await prisma.order.findMany({
    where: { status: "PENDING", paymentMethod: "BANK_TRANSFER", bankTransferAccountExpiresAt: { lt: new Date() } },
    include: { items: true },
  });

  let expiredCount = 0;
  for (const order of candidates) {
    const expired = await prisma.$transaction(async (tx) => {
      // Conditional guard against a race with the webhook: if this order was
      // just paid, the update matches 0 rows and stock/discount are left alone.
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      if (updated.count === 0) return false;

      await restoreStock(tx, order.items);
      if (order.discountCode) {
        await tx.discount.update({
          where: { storeId_code: { storeId: order.storeId, code: order.discountCode } },
          data: { usageCount: { decrement: 1 } },
        });
      }
      return true;
    });
    if (expired) expiredCount++;
  }

  return NextResponse.json({ expired: expiredCount });
}
