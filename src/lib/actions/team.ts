"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireStoreOwner } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";
import { sendEmail } from "@/lib/email";
import { staffInviteEmail } from "@/lib/email-templates";

export type TeamFormState = { error?: string };

const inviteSchema = z.object({ email: z.string().email() });

export async function inviteStaffMember(_prev: TeamFormState, formData: FormData): Promise<TeamFormState> {
  const store = await requireStoreOwner();
  if (!hasFeature(store.subscription, "STAFF_ACCOUNTS")) {
    return { error: "Staff accounts are available on the Business plan." };
  }

  const parsed = inviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };
  const email = parsed.data.email.toLowerCase();

  if (store.email && email === store.email.toLowerCase()) {
    return { error: "That's this store's own contact email." };
  }

  const existing = await prisma.storeMember.findUnique({ where: { storeId_email: { storeId: store.id, email } } });
  if (existing?.status === "ACTIVE") return { error: "That person is already on your team." };

  const inviteToken = crypto.randomBytes(32).toString("hex");

  await prisma.storeMember.upsert({
    where: { storeId_email: { storeId: store.id, email } },
    update: { inviteToken, status: "PENDING", invitedAt: new Date() },
    create: { storeId: store.id, email, inviteToken, status: "PENDING" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await sendEmail({
    to: email,
    ...staffInviteEmail({ storeName: store.name, acceptUrl: `${appUrl}/staff-invite/${inviteToken}` }),
  });

  revalidatePath("/dashboard/team");
  return {};
}

export async function removeStaffMember(id: string) {
  const store = await requireStoreOwner();
  await prisma.storeMember.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/dashboard/team");
}

export async function acceptStaffInvite(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();

  const invite = await prisma.storeMember.findUnique({ where: { inviteToken: token }, include: { store: true } });
  if (!invite || invite.status !== "PENDING") {
    return { ok: false, error: "This invitation is invalid or has already been used." };
  }
  if (!session.user.email || session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return { ok: false, error: `This invitation was sent to ${invite.email}. Sign in with that email to accept it.` };
  }

  await prisma.storeMember.update({
    where: { id: invite.id },
    data: { userId: session.user.id, status: "ACTIVE", acceptedAt: new Date(), inviteToken: null },
  });

  return { ok: true };
}
