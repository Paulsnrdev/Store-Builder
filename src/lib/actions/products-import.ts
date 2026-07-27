"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { parseCsv } from "@/lib/csv";
import { slugify } from "@/lib/slugify";

export type ImportResult = { created: number; updated: number; errors: string[] };

function parseBool(value: string): boolean {
  return ["true", "1", "yes"].includes(value.trim().toLowerCase());
}

export async function importProductsCsv(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const store = await getCurrentStore();
  const file = formData.get("file");
  const result: ImportResult = { created: 0, updated: 0, errors: [] };

  if (!(file instanceof File)) {
    result.errors.push("No file provided.");
    return result;
  }

  const text = await file.text();
  const rows = parseCsv(text);

  const categoryCache = new Map<string, string>();

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2; // account for header row, 1-indexed
    const name = row.name?.trim();
    if (!name) {
      result.errors.push(`Row ${rowNum}: missing name, skipped.`);
      continue;
    }
    const price = Number(row.price);
    if (Number.isNaN(price)) {
      result.errors.push(`Row ${rowNum}: invalid price, skipped.`);
      continue;
    }

    let categoryId: string | null = null;
    const categoryName = row.category?.trim();
    if (categoryName) {
      const key = categoryName.toLowerCase();
      if (categoryCache.has(key)) {
        categoryId = categoryCache.get(key)!;
      } else {
        const existing = await prisma.category.findFirst({
          where: { storeId: store.id, name: { equals: categoryName, mode: "insensitive" } },
        });
        if (existing) {
          categoryId = existing.id;
        } else {
          const slug = slugify(categoryName) || "category";
          const created = await prisma.category.create({
            data: { storeId: store.id, name: categoryName, slug },
          });
          categoryId = created.id;
        }
        categoryCache.set(key, categoryId);
      }
    }

    const slug = row.slug?.trim() || slugify(name);
    const data = {
      name,
      description: row.description?.trim() || null,
      categoryId,
      price,
      compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : null,
      costPrice: row.costPrice ? Number(row.costPrice) : null,
      sku: row.sku?.trim() || null,
      trackInventory: row.trackInventory ? parseBool(row.trackInventory) : true,
      stockQuantity: row.stockQuantity ? parseInt(row.stockQuantity, 10) || 0 : 0,
      isActive: row.isActive ? parseBool(row.isActive) : true,
      isFeatured: row.isFeatured ? parseBool(row.isFeatured) : false,
    };

    const existingProduct = await prisma.product.findFirst({ where: { storeId: store.id, slug } });

    if (existingProduct) {
      await prisma.product.update({ where: { id: existingProduct.id }, data });
      result.updated += 1;
    } else {
      await prisma.product.create({ data: { ...data, storeId: store.id, slug } });
      result.created += 1;
    }
  }

  revalidatePath("/dashboard/products");
  return result;
}
