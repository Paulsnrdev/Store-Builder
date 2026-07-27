"use server";

import { prisma } from "@/lib/prisma";
import type { CartItem } from "@/components/storefront/cart-context";

export type SyncedCart = { items: CartItem[]; updatedAt: string } | null;

export async function pullCart(storeId: string, phone: string): Promise<SyncedCart> {
  const phoneTrimmed = phone.trim();
  if (!phoneTrimmed) return null;

  const cart = await prisma.cart.findUnique({ where: { storeId_phone: { storeId, phone: phoneTrimmed } } });
  if (!cart) return null;

  return { items: cart.items as unknown as CartItem[], updatedAt: cart.updatedAt.toISOString() };
}

export async function pushCart(storeId: string, phone: string, items: CartItem[]): Promise<{ updatedAt: string } | null> {
  const phoneTrimmed = phone.trim();
  if (!phoneTrimmed) return null;

  const cart = await prisma.cart.upsert({
    where: { storeId_phone: { storeId, phone: phoneTrimmed } },
    update: { items: items as unknown as object },
    create: { storeId, phone: phoneTrimmed, items: items as unknown as object },
  });

  return { updatedAt: cart.updatedAt.toISOString() };
}
