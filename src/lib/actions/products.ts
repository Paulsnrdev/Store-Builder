"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { slugify } from "@/lib/slugify";
import { getProductLimit } from "@/lib/plan-limits";

const variantSchema = z.object({
  name: z.string().min(1),
  options: z.record(z.string(), z.string()),
  price: z.coerce.number().nonnegative().nullable().optional(),
  sku: z.string().nullable().optional(),
  stockQuantity: z.coerce.number().int().nonnegative().default(0),
});

const imageSchema = z.object({
  url: z.string().url(),
  altText: z.string().nullable().optional(),
});

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().nullable().optional(),
  costPrice: z.coerce.number().nonnegative().nullable().optional(),
  sku: z.string().nullable().optional(),
  trackInventory: z.coerce.boolean().default(true),
  stockQuantity: z.coerce.number().int().nonnegative().default(0),
  isActive: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
  weight: z.coerce.number().nonnegative().nullable().optional(),
  images: z.array(imageSchema).default([]),
  variants: z.array(variantSchema).default([]),
});

export type ProductFormState = { error?: string };

function parseProductForm(formData: FormData) {
  const imagesRaw = formData.get("images");
  const variantsRaw = formData.get("variants");

  return productSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId") || null,
    description: formData.get("description") || null,
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || null,
    costPrice: formData.get("costPrice") || null,
    sku: formData.get("sku") || null,
    trackInventory: formData.get("trackInventory") === "on",
    stockQuantity: formData.get("stockQuantity") ?? 0,
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    weight: formData.get("weight") || null,
    images: imagesRaw ? JSON.parse(String(imagesRaw)) : [],
    variants: variantsRaw ? JSON.parse(String(variantsRaw)) : [],
  });
}

async function uniqueProductSlug(storeId: string, name: string, excludeId?: string) {
  const base = slugify(name) || "product";
  let slug = base;
  let suffix = 0;
  while (
    await prisma.product.findFirst({
      where: { storeId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    })
  ) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

async function uniqueProductSku(storeId: string, sku: string | null | undefined, excludeId?: string) {
  if (!sku) return sku ?? null;
  const clash = await prisma.product.findFirst({
    where: { storeId, sku, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  return clash ? null : sku;
}

export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const store = await getCurrentStore();
  const parsed = parseProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const limit = getProductLimit(store.subscription);
  if (limit !== null) {
    const count = await prisma.product.count({ where: { storeId: store.id } });
    if (count >= limit) {
      return { error: `You've reached your plan's limit of ${limit} products. Upgrade your plan to add more.` };
    }
  }

  const slug = await uniqueProductSlug(store.id, data.name);
  const sku = await uniqueProductSku(store.id, data.sku);
  if (data.sku && !sku) return { error: "That SKU is already in use." };

  await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: data.categoryId || null,
      name: data.name,
      slug,
      description: data.description,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      costPrice: data.costPrice,
      sku,
      trackInventory: data.trackInventory,
      stockQuantity: data.stockQuantity,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      weight: data.weight,
      images: { create: data.images.map((img, i) => ({ url: img.url, altText: img.altText, sortOrder: i })) },
      variants: {
        create: data.variants.map((v) => ({
          name: v.name,
          options: v.options,
          price: v.price,
          sku: v.sku,
          stockQuantity: v.stockQuantity,
        })),
      },
    },
  });

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function updateProduct(id: string, _prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const store = await getCurrentStore();
  const existing = await prisma.product.findFirst({ where: { id, storeId: store.id } });
  if (!existing) return { error: "Product not found." };

  const parsed = parseProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const slug = existing.name === data.name ? existing.slug : await uniqueProductSlug(store.id, data.name, id);
  const sku = await uniqueProductSku(store.id, data.sku, id);
  if (data.sku && !sku) return { error: "That SKU is already in use." };

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: id } }),
    prisma.productVariant.deleteMany({ where: { productId: id } }),
    prisma.product.update({
      where: { id },
      data: {
        categoryId: data.categoryId || null,
        name: data.name,
        slug,
        description: data.description,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        costPrice: data.costPrice,
        sku,
        trackInventory: data.trackInventory,
        stockQuantity: data.stockQuantity,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        weight: data.weight,
        images: { create: data.images.map((img, i) => ({ url: img.url, altText: img.altText, sortOrder: i })) },
        variants: {
          create: data.variants.map((v) => ({
            name: v.name,
            options: v.options,
            price: v.price,
            sku: v.sku,
            stockQuantity: v.stockQuantity,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function deleteProduct(id: string) {
  const store = await getCurrentStore();
  await prisma.product.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/dashboard/products");
}

export async function duplicateProduct(id: string) {
  const store = await getCurrentStore();
  const original = await prisma.product.findFirst({
    where: { id, storeId: store.id },
    include: { images: true, variants: true },
  });
  if (!original) return;

  const slug = await uniqueProductSlug(store.id, `${original.name} copy`);

  await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: original.categoryId,
      name: `${original.name} (copy)`,
      slug,
      description: original.description,
      price: original.price,
      compareAtPrice: original.compareAtPrice,
      costPrice: original.costPrice,
      sku: null,
      trackInventory: original.trackInventory,
      stockQuantity: original.stockQuantity,
      isActive: false,
      isFeatured: false,
      weight: original.weight,
      images: { create: original.images.map((img) => ({ url: img.url, altText: img.altText, sortOrder: img.sortOrder })) },
      variants: {
        create: original.variants.map((v) => ({
          name: v.name,
          options: v.options as object,
          price: v.price,
          sku: null,
          stockQuantity: v.stockQuantity,
        })),
      },
    },
  });

  revalidatePath("/dashboard/products");
}

export async function bulkSetActive(ids: string[], isActive: boolean) {
  const store = await getCurrentStore();
  await prisma.product.updateMany({ where: { id: { in: ids }, storeId: store.id }, data: { isActive } });
  revalidatePath("/dashboard/products");
}

export async function bulkDeleteProducts(ids: string[]) {
  const store = await getCurrentStore();
  await prisma.product.deleteMany({ where: { id: { in: ids }, storeId: store.id } });
  revalidatePath("/dashboard/products");
}
