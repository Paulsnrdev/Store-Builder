"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { slugify } from "@/lib/slugify";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

async function uniqueCategorySlug(storeId: string, name: string, excludeId?: string) {
  const base = slugify(name) || "category";
  let slug = base;
  let suffix = 0;
  while (
    await prisma.category.findFirst({
      where: { storeId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    })
  ) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export type CategoryFormState = { error?: string };

export async function createCategory(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const store = await getCurrentStore();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    imageUrl: formData.get("imageUrl") || null,
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const slug = await uniqueCategorySlug(store.id, parsed.data.name);

  await prisma.category.create({
    data: { storeId: store.id, name: parsed.data.name, slug, imageUrl: parsed.data.imageUrl, sortOrder: parsed.data.sortOrder },
  });

  revalidatePath("/dashboard/categories");
  redirect("/dashboard/categories");
}

export async function updateCategory(id: string, _prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const store = await getCurrentStore();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    imageUrl: formData.get("imageUrl") || null,
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const existing = await prisma.category.findFirst({ where: { id, storeId: store.id } });
  if (!existing) return { error: "Category not found." };

  const slug = existing.name === parsed.data.name ? existing.slug : await uniqueCategorySlug(store.id, parsed.data.name, id);

  await prisma.category.update({
    where: { id },
    data: { name: parsed.data.name, slug, imageUrl: parsed.data.imageUrl, sortOrder: parsed.data.sortOrder },
  });

  revalidatePath("/dashboard/categories");
  redirect("/dashboard/categories");
}

export async function deleteCategory(id: string) {
  const store = await getCurrentStore();
  await prisma.category.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/dashboard/categories");
}
