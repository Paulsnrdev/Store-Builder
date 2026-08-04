"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { signIn } from "@/auth";
import { requireSession } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import { welcomeSellerEmail, passwordResetEmail } from "@/lib/email-templates";
import { NICHE_VALUES } from "@/lib/store-niches";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  storeName: z.string().min(2),
  niche: z.enum(NICHE_VALUES),
});

export type RegisterState = { error?: string };

export async function registerSeller(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    storeName: formData.get("storeName"),
    niche: formData.get("niche"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, email, password, storeName, niche } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const slug = slugify(storeName) || "store";
  if (await prisma.store.findUnique({ where: { slug } })) {
    return { error: "That store name is taken. Please choose another." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      stores: {
        create: {
          name: storeName,
          slug,
          currency: "NGN",
          niche,
        },
      },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await sendEmail({ to: email, ...welcomeSellerEmail({ storeName, name, dashboardUrl: `${appUrl}/dashboard` }) });

  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return {};
}

const storeSetupSchema = z.object({ storeName: z.string().min(2), niche: z.enum(NICHE_VALUES) });

/**
 * For a user who's already authenticated (e.g. just signed in with Google for the
 * first time) but has no store yet. Unlike registerSeller, this never touches
 * User/password — it only attaches a Store to the existing session's user.
 */
export async function completeStoreSetup(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const session = await requireSession();

  const parsed = storeSetupSchema.safeParse({ storeName: formData.get("storeName"), niche: formData.get("niche") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existingStore = await prisma.store.findFirst({ where: { userId: session.user.id } });
  if (existingStore) redirect("/dashboard");

  const slug = slugify(parsed.data.storeName) || "store";
  if (await prisma.store.findUnique({ where: { slug } })) {
    return { error: "That store name is taken. Please choose another." };
  }

  await prisma.store.create({
    data: { userId: session.user.id, name: parsed.data.storeName, slug, currency: "NGN", niche: parsed.data.niche },
  });

  if (session.user.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendEmail({
      to: session.user.email,
      ...welcomeSellerEmail({ storeName: parsed.data.storeName, name: session.user.name || "there", dashboardUrl: `${appUrl}/dashboard` }),
    });
  }

  redirect("/dashboard");
}

export type ForgotPasswordState = { submitted?: boolean; error?: string };

const forgotPasswordSchema = z.object({ email: z.string().email() });

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Same response whether or not the account exists, so this can't be used to check
  // which emails are registered.
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendEmail({ to: email, ...passwordResetEmail({ resetUrl: `${appUrl}/reset-password/${token}` }) });
  }

  return { submitted: true };
}

export type ResetPasswordState = { error?: string; success?: boolean };

const resetPasswordSchema = z
  .object({ password: z.string().min(8), confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, { message: "Passwords don't match." });

export async function resetPassword(
  token: string,
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const record = await prisma.verificationToken.findFirst({ where: { token } });
  if (!record || record.expires < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({ where: { email: record.identifier }, data: { password: passwordHash } });
  await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });

  return { success: true };
}

export type ChangePasswordState = { error?: string; success?: boolean };

const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1), newPassword: z.string().min(8), confirmPassword: z.string() })
  .refine((data) => data.newPassword === data.confirmPassword, { message: "Passwords don't match." });

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await requireSession();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) {
    return { error: "This account signs in with Google and has no password to change." };
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: passwordHash } });

  return { success: true };
}
