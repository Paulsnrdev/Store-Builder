import { notFound } from "next/navigation";
import { getPublishedStore } from "@/lib/storefront";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ProductCard } from "@/components/storefront/product-card";
import { isProductOutOfStock } from "@/lib/inventory-status";

const SORT_OPTIONS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  "price-asc": { price: "asc" },
  "price-desc": { price: "desc" },
  name: { name: "asc" },
};

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug, categorySlug } = await params;
  const { sort } = await searchParams;
  const store = await getPublishedStore(slug);

  const category = await prisma.category.findFirst({ where: { storeId: store.id, slug: categorySlug } });
  if (!category) notFound();

  const orderBy = SORT_OPTIONS[sort ?? "newest"] ?? SORT_OPTIONS.newest;

  const products = await prisma.product.findMany({
    where: { storeId: store.id, categoryId: category.id, isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { select: { stockQuantity: true } } },
    orderBy,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{category.name}</h1>
        <form method="get" className="flex items-center gap-2">
          <select name="sort" defaultValue={sort ?? "newest"} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Name: A-Z</option>
          </select>
          <button type="submit" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            Sort
          </button>
        </form>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-gray-400">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              storeSlug={store.slug}
              product={{
                slug: p.slug,
                name: p.name,
                price: p.price.toString(),
                compareAtPrice: p.compareAtPrice?.toString() ?? null,
                imageUrl: p.images[0]?.url ?? null,
                outOfStock: isProductOutOfStock(p),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
