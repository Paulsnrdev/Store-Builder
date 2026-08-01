import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedStore } from "@/lib/storefront";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/request-cache";
import { Prisma } from "@/generated/prisma/client";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { isProductOutOfStock } from "@/lib/inventory-status";

const SORT_OPTIONS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  "price-asc": { price: "asc" },
  "price-desc": { price: "desc" },
  name: { name: "asc" },
};

function fetchCategoryData(storeId: string, categorySlug: string, sort: string) {
  return cached(`category:${storeId}:${categorySlug}:${sort}`, 60_000, async () => {
    const category = await prisma.category.findFirst({ where: { storeId, slug: categorySlug } });
    if (!category) return null;

    const orderBy = SORT_OPTIONS[sort] ?? SORT_OPTIONS.newest;
    const products = await prisma.product.findMany({
      where: { storeId, categoryId: category.id, isActive: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { select: { stockQuantity: true } } },
      orderBy,
    });

    const mappedProducts: ProductCardData[] = products.map((p) => ({
      slug: p.slug,
      name: p.name,
      price: p.price.toString(),
      compareAtPrice: p.compareAtPrice?.toString() ?? null,
      imageUrl: p.images[0]?.url ?? null,
      outOfStock: isProductOutOfStock(p),
    }));

    return { name: category.name, products: mappedProducts };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { slug, categorySlug } = await params;
  const store = await getPublishedStore(slug);
  const data = await fetchCategoryData(store.id, categorySlug, "newest");
  if (!data) return {};

  return { title: `${data.name} — ${store.name}`, description: `Shop ${data.name} at ${store.name}.` };
}

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

  const data = await fetchCategoryData(store.id, categorySlug, sort ?? "newest");
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{data.name}</h1>
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

      {data.products.length === 0 ? (
        <p className="text-sm text-gray-400">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard key={p.slug} storeSlug={store.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
