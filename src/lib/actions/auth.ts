"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { signIn } from "@/auth";
import { requireSession } from "@/lib/store";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  storeName: z.string().min(2),
});

export type RegisterState = { error?: string };

export async function registerSeller(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    storeName: formData.get("storeName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, email, password, storeName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const baseSlug = slugify(storeName) || "store";
  let slug = baseSlug;
  let suffix = 0;
  while (await prisma.store.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
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
        },
      },
    },
  });

  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return {};
}

const storeSetupSchema = z.object({ storeName: z.string().min(2) });

/**
 * For a user who's already authenticated (e.g. just signed in with Google for the
 * first time) but has no store yet. Unlike registerSeller, this never touches
 * User/password — it only attaches a Store to the existing session's user.
 */
export async function completeStoreSetup(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const session = await requireSession();

  const parsed = storeSetupSchema.safeParse({ storeName: formData.get("storeName") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existingStore = await prisma.store.findFirst({ where: { userId: session.user.id } });
  if (existingStore) redirect("/dashboard");

  const baseSlug = slugify(parsed.data.storeName) || "store";
  let slug = baseSlug;
  let suffix = 0;
  while (await prisma.store.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  await prisma.store.create({
    data: { userId: session.user.id, name: parsed.data.storeName, slug, currency: "NGN" },
  });

  redirect("/dashboard");
}
