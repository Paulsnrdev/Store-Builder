import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type DiscountValidation =
  | { ok: true; discountId: string; code: string; amount: number }
  | { ok: false; error: string };

export async function validateDiscountCode(
  storeId: string,
  code: string,
  subtotal: number,
  tx: Prisma.TransactionClient = prisma
): Promise<DiscountValidation> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter a discount code." };

  const discount = await tx.discount.findFirst({ where: { storeId, code: normalized } });
  if (!discount || !discount.isActive) return { ok: false, error: "Invalid discount code." };

  const now = new Date();
  if (discount.startsAt && now < discount.startsAt) return { ok: false, error: "This code isn't active yet." };
  if (discount.expiresAt && now > discount.expiresAt) return { ok: false, error: "This code has expired." };
  if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
    return { ok: false, error: "This code has reached its usage limit." };
  }
  if (discount.minOrderValue && subtotal < Number(discount.minOrderValue)) {
    return { ok: false, error: `Minimum order of ₦${Number(discount.minOrderValue).toLocaleString()} required.` };
  }

  const amount =
    discount.type === "PERCENTAGE" ? Math.round((subtotal * Number(discount.value)) / 100) : Math.min(Number(discount.value), subtotal);

  return { ok: true, discountId: discount.id, code: discount.code, amount };
}
