import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";
import { MarketingFooter } from "@/components/marketing/footer";

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
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-gray-900">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" />
                <path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" />
                <path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" />
              </svg>
            </span>
            <span className="text-lg font-semibold text-gray-900">StoreHike</span>
          </span>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Log in
            </Link>
            <Link href="/register" className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
              Create your store
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
          Turn your Instagram &amp; WhatsApp shop into a real store
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Stop taking orders one DM at a time. StoreHike gives Nigerian sellers a hosted storefront, cart,
          checkout, and order dashboard set up in minutes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create your store
          </Link>
        </div>
      </section>

      <section id="features" className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-gray-900">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
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
