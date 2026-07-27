"use server";

import { prisma } from "@/lib/prisma";
import { validateDiscountCode, type DiscountValidation } from "@/lib/discounts";

export async function previewDiscount(storeId: string, code: string, subtotal: number): Promise<DiscountValidation> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { ok: false, error: "Store not found." };
  return validateDiscountCode(storeId, code, subtotal);
}
