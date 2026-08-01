import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublishedStore } from "@/lib/storefront";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/request-cache";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { isProductOutOfStock } from "@/lib/inventory-status";
import { appUrl, jsonLd, truncate } from "@/lib/seo";

function fetchHomeData(storeId: string) {
  return cached(`home:${storeId}`, 60_000, async () => {
    const [categories, featured, allProducts] = await Promise.all([
      prisma.category.findMany({ where: { storeId }, orderBy: { sortOrder: "asc" } }),
      prisma.product.findMany({
        where: { storeId, isActive: true, isFeatured: true },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { select: { stockQuantity: true } } },
        orderBy: { sortOrder: "asc" },
        take: 8,
      }),
      prisma.product.findMany({
        where: { storeId, isActive: true },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { select: { stockQuantity: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const mapProduct = (p: (typeof featured)[number]): ProductCardData => ({
      slug: p.slug,
      name: p.name,
      price: p.price.toString(),
      compareAtPrice: p.compareAtPrice?.toString() ?? null,
      imageUrl: p.images[0]?.url ?? null,
      outOfStock: isProductOutOfStock(p),
    });

    return {
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
      featured: featured.map(mapProduct),
      allProducts: allProducts.map(mapProduct),
    };
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublishedStore(slug);
  const description = store.description ? truncate(store.description, 160) : `Shop ${store.name} online.`;

  return {
    title: store.name,
    description,
    openGraph: {
      title: store.name,
      description,
      url: `${appUrl()}/shop/${store.slug}`,
      images: store.bannerUrl ? [store.bannerUrl] : store.logoUrl ? [store.logoUrl] : [],
    },
  };
}

export default async function StorefrontHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getPublishedStore(slug);
  const { categories, featured, allProducts } = await fetchHomeData(store.id);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "Store",
          name: store.name,
          description: store.description ?? undefined,
          url: `${appUrl()}/shop/${store.slug}`,
          logo: store.logoUrl ?? undefined,
          telephone: store.phone ?? undefined,
        })}
      />
      {store.bannerUrl && (
        <div className="relative h-40 w-full sm:h-64">
          <Image src={store.bannerUrl} alt={store.name} fill priority sizes="100vw" className="object-cover" />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-6">
        {store.description && <p className="mb-6 text-sm text-gray-600">{store.description}</p>}

        {categories.length > 0 && (
          <div className="mb-8">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/shop/${store.slug}/category/${c.slug}`}
                  className="shrink-0 rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {featured.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Featured</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.slug} storeSlug={store.slug} product={p} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">All products</h2>
          {allProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No products yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {allProducts.map((p) => (
                <ProductCard key={p.slug} storeSlug={store.slug} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
