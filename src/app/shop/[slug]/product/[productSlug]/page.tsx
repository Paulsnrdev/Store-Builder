import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedStore } from "@/lib/storefront";
import { prisma } from "@/lib/prisma";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductOptions } from "@/components/storefront/product-options";
import { ProductCard } from "@/components/storefront/product-card";
import { isProductOutOfStock } from "@/lib/inventory-status";
import { appUrl, jsonLd, stripHtml, truncate } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const store = await getPublishedStore(slug);
  const product = await prisma.product.findFirst({
    where: { storeId: store.id, slug: productSlug, isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!product) return {};

  const description = product.description ? truncate(stripHtml(product.description), 160) : `${product.name} at ${store.name}.`;

  return {
    title: `${product.name} — ${store.name}`,
    description,
    openGraph: {
      title: product.name,
      description,
      url: `${appUrl()}/shop/${store.slug}/product/${product.slug}`,
      images: product.images[0] ? [product.images[0].url] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
  const store = await getPublishedStore(slug);

  const product = await prisma.product.findFirst({
    where: { storeId: store.id, slug: productSlug, isActive: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      category: true,
    },
  });
  if (!product) notFound();

  const related = product.categoryId
    ? await prisma.product.findMany({
        where: { storeId: store.id, categoryId: product.categoryId, isActive: true, id: { not: product.id } },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { select: { stockQuantity: true } } },
        take: 4,
      })
    : [];

  const outOfStock = isProductOutOfStock(product);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description ? stripHtml(product.description) : undefined,
          image: product.images.map((i) => i.url),
          offers: {
            "@type": "Offer",
            url: `${appUrl()}/shop/${store.slug}/product/${product.slug}`,
            priceCurrency: store.currency,
            price: product.price.toString(),
            availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          },
        })}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <ProductGallery images={product.images.map((i) => i.url)} name={product.name} />

        <div>
          {product.category && (
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{product.category.name}</p>
          )}
          <h1 className="mt-1 text-xl font-semibold text-gray-900">{product.name}</h1>

          <div className="mt-3">
            <ProductOptions
              storeSlug={store.slug}
              productId={product.id}
              slug={product.slug}
              name={product.name}
              basePrice={Number(product.price)}
              image={product.images[0]?.url ?? null}
              trackInventory={product.trackInventory}
              stockQuantity={product.stockQuantity}
              variants={product.variants.map((v) => ({
                id: v.id,
                name: v.name,
                options: v.options as Record<string, string>,
                price: v.price ? Number(v.price) : null,
                stockQuantity: v.stockQuantity,
              }))}
            />
          </div>

          {product.description && (
            <div
              className="prose prose-sm mt-6 max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
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
        </section>
      )}
    </div>
  );
}
