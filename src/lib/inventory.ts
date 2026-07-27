import type { Prisma } from "@/generated/prisma/client";
import type { PricedLineItem } from "@/lib/order-pricing";

export class InsufficientStockError extends Error {
  constructor(public productName: string) {
    super(`Not enough stock for ${productName}.`);
  }
}

/**
 * Atomically reserves stock for an order at creation time (not at payment
 * confirmation) so two concurrent checkouts for the last unit can't both
 * succeed. The conditional `stockQuantity: { gte }` in the WHERE clause
 * makes each decrement a single atomic compare-and-set — the loser sees
 * `count === 0` and the whole order creation transaction rolls back.
 */
export async function reserveStock(tx: Prisma.TransactionClient, lineItems: PricedLineItem[]) {
  for (const item of lineItems) {
    if (item.variantId) {
      const result = await tx.productVariant.updateMany({
        where: { id: item.variantId, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (result.count === 0) throw new InsufficientStockError(item.productName);
    } else {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
        select: { trackInventory: true },
      });
      if (!product.trackInventory) continue;

      const result = await tx.product.updateMany({
        where: { id: item.productId, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (result.count === 0) throw new InsufficientStockError(item.productName);
    }
  }
}

/** Restores stock reserved by reserveStock — used on order cancellation/refund. */
export async function restoreStock(
  tx: Prisma.TransactionClient,
  orderItems: { productId: string | null; variantId: string | null; quantity: number }[]
) {
  for (const item of orderItems) {
    if (item.variantId) {
      await tx.productVariant.updateMany({
        where: { id: item.variantId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    } else if (item.productId) {
      await tx.product.updateMany({
        where: { id: item.productId, trackInventory: true },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }
  }
}
