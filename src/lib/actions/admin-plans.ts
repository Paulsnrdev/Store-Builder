"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/slugify";

export type PlanFormState = { error?: string };

const planSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  monthlyPrice: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0),
  currency: z.string().min(1).default("NGN"),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

function parsePlanForm(formData: FormData) {
  return planSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    monthlyPrice: formData.get("monthlyPrice"),
    yearlyPrice: formData.get("yearlyPrice"),
    currency: formData.get("currency") || "NGN",
    isActive: formData.get("isActive") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
  });
}

async function uniquePlanSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "plan";
  let slug = base;
  let suffix = 0;
  while (await prisma.plan.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export async function createPlan(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  await requireAdmin();

  const parsed = parsePlanForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const slug = await uniquePlanSlug(parsed.data.name);

  await prisma.plan.create({ data: { ...parsed.data, slug } });

  revalidatePath("/admin/plans");
  redirect("/admin/plans");
}

export async function updatePlan(id: string, _prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  await requireAdmin();

  const parsed = parsePlanForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return { error: "Plan not found." };

  const slug = existing.name === parsed.data.name ? existing.slug : await uniquePlanSlug(parsed.data.name, id);

  await prisma.plan.update({ where: { id }, data: { ...parsed.data, slug } });

  revalidatePath("/admin/plans");
  redirect("/admin/plans");
}

export async function togglePlanActive(id: string) {
  await requireAdmin();
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id } });
  await prisma.plan.update({ where: { id }, data: { isActive: !plan.isActive } });
  revalidatePath("/admin/plans");
}

export async function deletePlan(id: string) {
  await requireAdmin();
  await prisma.plan.deleteMany({ where: { id, subscriptions: { none: {} } } });
  revalidatePath("/admin/plans");
}
