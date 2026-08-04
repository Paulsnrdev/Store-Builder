import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoresByNiche } from "@/lib/marketplace";
import { nicheBySlug } from "@/lib/store-niches";
import { Logo } from "@/components/marketing/logo";
import { MarketingFooter } from "@/components/marketing/footer";
import { StoreCard } from "@/components/marketing/store-card";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const niche = nicheBySlug(slug);
  return { title: niche ? niche.label : "Marketplace" };
}

export default async function MarketplaceNichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const niche = nicheBySlug(slug);
  if (!niche) notFound();

  const stores = await getStoresByNiche(niche.value);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo />
          <Link href="/marketplace" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            All niches
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl flex-1 animate-fade-in px-4 py-16">
        <Link href="/marketplace" className="text-sm text-gray-500 hover:underline">
          ← Marketplace
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{niche.label}</h1>
        <p className="mt-2 text-gray-600">
          {stores.length} {stores.length === 1 ? "seller" : "sellers"} in this niche
        </p>

        {stores.length === 0 ? (
          <p className="mt-10 text-sm text-gray-500">No sellers here yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </section>

      <MarketingFooter />
    </div>
  );
}
