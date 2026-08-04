"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";

const settingsSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  email: z.string().email().nullable().or(z.literal("")).optional(),
  address: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  themeColor: z.string().nullable().optional(),
  themeFont: z.string().nullable().optional(),
  socialInstagram: z.string().nullable().optional(),
  socialFacebook: z.string().nullable().optional(),
  socialTwitter: z.string().nullable().optional(),
  socialTiktok: z.string().nullable().optional(),
  announcementText: z.string().nullable().optional(),
  announcementEnabled: z.coerce.boolean().default(false),
  bankName: z.string().nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  bankAccountName: z.string().nullable().optional(),
  flutterwaveSubaccountId: z.string().nullable().optional(),
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
    logoUrl: formData.get("logoUrl") || null,
    bannerUrl: formData.get("bannerUrl") || null,
    themeColor: formData.get("themeColor") || null,
    themeFont: formData.get("themeFont") || null,
    socialInstagram: formData.get("socialInstagram") || null,
    socialFacebook: formData.get("socialFacebook") || null,
    socialTwitter: formData.get("socialTwitter") || null,
    socialTiktok: formData.get("socialTiktok") || null,
    announcementText: formData.get("announcementText") || null,
    announcementEnabled: formData.get("announcementEnabled") === "on",
    bankName: formData.get("bankName") || null,
    bankAccountNumber: formData.get("bankAccountNumber") || null,
    bankAccountName: formData.get("bankAccountName") || null,
    flutterwaveSubaccountId: formData.get("flutterwaveSubaccountId") || null,
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  // Font choice is a Basic+ feature (accent color stays available on every plan) — silently
  // clamp rather than error, so a gated field doesn't block saving the rest of this form.
  const themeFont = hasFeature(store.subscription, "THEME_CUSTOMIZATION") ? data.themeFont : "sans";

  await prisma.store.update({
    where: { id: store.id },
    data: {
      name: data.name,
      phone: data.phone,
      whatsappNumber: data.whatsappNumber,
      email: data.email,
      address: data.address,
      description: data.description,
      logoUrl: data.logoUrl,
      bannerUrl: data.bannerUrl,
      theme: { color: data.themeColor || undefined, font: themeFont || undefined },
      socialLinks: {
        instagram: data.socialInstagram || undefined,
        facebook: data.socialFacebook || undefined,
        twitter: data.socialTwitter || undefined,
        tiktok: data.socialTiktok || undefined,
      },
      announcementText: data.announcementText,
      announcementEnabled: data.announcementEnabled,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountName: data.bankAccountName,
      flutterwaveSubaccountId: data.flutterwaveSubaccountId,
      isPublished: data.isPublished,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/shop/${store.slug}`, "layout");
  return { success: true };
}
