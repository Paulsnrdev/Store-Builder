"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";

const settingsSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  email: z.string().email().nullable().or(z.literal("")).optional(),
  address: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  bankAccountName: z.string().nullable().optional(),
  paystackSubaccountCode: z.string().nullable().optional(),
  isPublished: z.coerce.boolean().default(false),
});

export type SettingsFormState = { error?: string; success?: boolean };

export async function updateStoreSettings(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const store = await getCurrentStore();

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || null,
    whatsappNumber: formData.get("whatsappNumber") || null,
    email: formData.get("email") || null,
    address: formData.get("address") || null,
    description: formData.get("description") || null,
    bankName: formData.get("bankName") || null,
    bankAccountNumber: formData.get("bankAccountNumber") || null,
    bankAccountName: formData.get("bankAccountName") || null,
    paystackSubaccountCode: formData.get("paystackSubaccountCode") || null,
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.store.update({ where: { id: store.id }, data: parsed.data });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
