"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";

export type DiscountFormState = { error?: string };

const discountSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(30)
    .transform((v) => v.trim().toUpperCase()),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.coerce.number().positive(),
  minOrderValue: z.coerce.number().nonnegative().nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.coerce.boolean().default(true),
});

function parseDiscountForm(formData: FormData) {
  const minOrderValueRaw = formData.get("minOrderValue");
  const usageLimitRaw = formData.get("usageLimit");
  return discountSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    minOrderValue: minOrderValueRaw ? minOrderValueRaw : null,
    usageLimit: usageLimitRaw ? usageLimitRaw : null,
    startsAt: formData.get("startsAt") || null,
    expiresAt: formData.get("expiresAt") || null,
    isActive: formData.get("isActive") === "on",
  });
}

export async function createDiscount(_prev: DiscountFormState, formData: FormData): Promise<DiscountFormState> {
  const store = await getCurrentStore();
  if (!hasFeature(store.subscription, "DISCOUNT_CODES")) {
    return { error: "Discount codes are available on the Growth plan and above." };
  }

  const parsed = parseDiscountForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const existing = await prisma.discount.findFirst({ where: { storeId: store.id, code: data.code } });
  if (existing) return { error: "A discount with this code already exists." };

  await prisma.discount.create({
    data: {
      storeId: store.id,
      code: data.code,
      type: data.type,
      value: data.value,
      minOrderValue: data.minOrderValue,
      usageLimit: data.usageLimit,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: data.isActive,
    },
  });

  revalidatePath("/dashboard/discounts");
  redirect("/dashboard/discounts");
}

export async function updateDiscount(id: string, _prev: DiscountFormState, formData: FormData): Promise<DiscountFormState> {
  const store = await getCurrentStore();
  if (!hasFeature(store.subscription, "DISCOUNT_CODES")) {
    return { error: "Discount codes are available on the Growth plan and above." };
  }

  const existing = await prisma.discount.findFirst({ where: { id, storeId: store.id } });
  if (!existing) return { error: "Discount not found." };

  const parsed = parseDiscountForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  if (data.code !== existing.code) {
    const codeInUse = await prisma.discount.findFirst({ where: { storeId: store.id, code: data.code, id: { not: id } } });
    if (codeInUse) return { error: "A discount with this code already exists." };
  }

  await prisma.discount.update({
    where: { id },
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      minOrderValue: data.minOrderValue,
      usageLimit: data.usageLimit,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: data.isActive,
    },
  });

  revalidatePath("/dashboard/discounts");
  redirect("/dashboard/discounts");
}

export async function deleteDiscount(id: string) {
  const store = await getCurrentStore();
  await prisma.discount.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/dashboard/discounts");
}
