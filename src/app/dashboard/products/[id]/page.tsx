import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { ProductForm, type ProductInitial } from "@/components/dashboard/product-form";
import { updateProduct } from "@/lib/actions/products";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getCurrentStore();
  const [product, categories] = await Promise.all([
    prisma.product.findFirst({
      where: { id, storeId: store.id },
      include: { images: { orderBy: { sortOrder: "asc" } }, variants: true },
    }),
    prisma.category.findMany({ where: { storeId: store.id }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  const initial: ProductInitial = {
    name: product.name,
    categoryId: product.categoryId,
    description: product.description,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    sku: product.sku,
    trackInventory: product.trackInventory,
    stockQuantity: product.stockQuantity,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    weight: product.weight,
    images: product.images.map((img) => ({ url: img.url, altText: img.altText ?? undefined })),
    variants: product.variants.map((v) => ({
      name: v.name,
      options: v.options as Record<string, string>,
      price: v.price ? Number(v.price) : null,
      sku: v.sku,
      stockQuantity: v.stockQuantity,
    })),
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Edit product</h1>
      <div className="mt-6">
        <ProductForm action={updateProduct.bind(null, product.id)} categories={categories} initial={initial} />
      </div>
    </div>
  );
}
