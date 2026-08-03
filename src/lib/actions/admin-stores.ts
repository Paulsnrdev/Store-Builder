"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export type AdminFormState = { error?: string; success?: boolean };

const storeDetailsSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().or(z.literal("")).optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isPublished: z.coerce.boolean().default(false),
});

export async function updateStoreDetailsAdmin(storeId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = storeDetailsSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    address: formData.get("address") || null,
    description: formData.get("description") || null,
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.store.update({ where: { id: storeId }, data: parsed.data });

  revalidatePath(`/admin/businesses/${storeId}`);
  revalidatePath("/admin/businesses");
  return { success: true };
}

const suspendSchema = z.object({
  reason: z.string().nullable().optional(),
});

export async function suspendStore(storeId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = suspendSchema.safeParse({ reason: formData.get("reason") || null });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.store.update({
    where: { id: storeId },
    data: { isSuspended: true, suspendedAt: new Date(), suspendedReason: parsed.data.reason },
  });

  revalidatePath(`/admin/businesses/${storeId}`);
  revalidatePath("/admin/businesses");
  return { success: true };
}

export async function activateStore(storeId: string) {
  await requireAdmin();

  await prisma.store.update({
    where: { id: storeId },
    data: { isSuspended: false, suspendedAt: null, suspendedReason: null },
  });

  revalidatePath(`/admin/businesses/${storeId}`);
  revalidatePath("/admin/businesses");
}

const assignPlanSchema = z.object({
  planId: z.string().min(1),
  interval: z.enum(["MONTHLY", "BIANNUAL", "YEARLY"]),
  status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"]),
  currentPeriodEnd: z.string().optional(),
});

export async function assignStorePlan(storeId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = assignPlanSchema.safeParse({
    planId: formData.get("planId"),
    interval: formData.get("interval"),
    status: formData.get("status"),
    currentPeriodEnd: formData.get("currentPeriodEnd") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const data = {
    planId: parsed.data.planId,
    interval: parsed.data.interval,
    status: parsed.data.status,
    currentPeriodEnd: parsed.data.currentPeriodEnd ? new Date(parsed.data.currentPeriodEnd) : null,
  };

  await prisma.subscription.upsert({
    where: { storeId },
    update: data,
    create: { storeId, ...data },
  });

  revalidatePath(`/admin/businesses/${storeId}`);
  revalidatePath("/admin/businesses");
  return { success: true };
}

export async function deleteStoreAdmin(storeId: string) {
  await requireAdmin();
  await prisma.store.delete({ where: { id: storeId } });
  revalidatePath("/admin/businesses");
  redirect("/admin/businesses");
}
