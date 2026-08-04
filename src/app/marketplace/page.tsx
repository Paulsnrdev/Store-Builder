import Link from "next/link";
import type { Metadata } from "next";
import { getNicheCounts } from "@/lib/marketplace";
import { Logo } from "@/components/marketing/logo";
import { MarketingFooter } from "@/components/marketing/footer";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Marketplace" };
export const revalidate = 60;

export default async function MarketplacePage() {
  const niches = await getNicheCounts();

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo />
          <Link href="/register" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Create your store
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl flex-1 animate-fade-in px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Marketplace</h1>
        <p className="mt-2 max-w-xl text-gray-600">Browse sellers on StoreHike by what they sell.</p>

        {niches.length === 0 ? (
          <p className="mt-10 text-sm text-gray-500">No published stores yet — check back soon.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {niches.map((n) => (
              <Link key={n.value} href={`/marketplace/${n.slug}`}>
                <Card className="transition-shadow duration-200 hover:shadow-card-hover">
                  <h2 className="font-semibold text-gray-900">{n.label}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {n.count} {n.count === 1 ? "seller" : "sellers"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <MarketingFooter />
    </div>
  );
}
