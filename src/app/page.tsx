import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";
import { MarketingFooter } from "@/components/marketing/footer";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    title: "A real storefront",
    body: "Products, categories, variants, and search — hosted at your own link, not buried in a DM thread.",
  },
  {
    title: "Cart & checkout",
    body: "Customers pay by card, bank transfer, or cash on delivery. Shipping is calculated by state automatically.",
  },
  {
    title: "Order management",
    body: "Track every order from pending to delivered, print invoices, and message customers on WhatsApp in one tap.",
  },
  {
    title: "Never oversell",
    body: "Stock is reserved the moment an order is placed, so two buyers can never both check out with the last unit.",
  },
];

const STEPS = [
  { step: "1", title: "Create your store", body: "Sign up and add your first products in minutes — no code, no design skills needed." },
  { step: "2", title: "Share your link", body: "Swap your Instagram bio link and WhatsApp status for a real storefront customers can browse and pay on." },
  { step: "3", title: "Get paid, fulfil orders", body: "Payments land in your account via Flutterwave. Manage every order from one dashboard." },
];

export default function MarketingHomePage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/marketplace" className="hidden text-gray-600 hover:text-gray-900 sm:inline">
              Marketplace
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Log in
            </Link>
            <Button href="/register">Create your store</Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl animate-slide-up px-4 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
          Turn your Instagram &amp; WhatsApp shop into a real store
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Stop taking orders one DM at a time. StoreHike gives Nigerian sellers a hosted storefront, cart,
          checkout, and order dashboard set up in minutes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button href="/register" size="md" className="px-6 py-3">
            Create your store
          </Button>
        </div>
      </section>

      <section id="features" className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Card
              key={f.title}
              className="animate-slide-up transition-shadow duration-200 hover:shadow-card-hover"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-gray-900">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.step} className="animate-slide-up text-center" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {s.step}
                </div>
                <h3 className="mt-3 font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      <MarketingFooter />
    </div>
  );
}
