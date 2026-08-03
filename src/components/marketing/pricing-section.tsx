"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Cycle = "monthly" | "biannual" | "annual";

const CYCLE_LABEL: Record<Cycle, string> = {
  monthly: "Monthly",
  biannual: "Every 6 months",
  annual: "Yearly",
};

// Discretionary discount off the monthly rate for committing longer — a common
// SaaS convention (~10% for a half-year commitment, ~20% for a full year).
const CYCLE_DISCOUNT: Record<Cycle, number> = { monthly: 0, biannual: 0.1, annual: 0.2 };
const CYCLE_MONTHS: Record<Cycle, number> = { monthly: 1, biannual: 6, annual: 12 };

type Plan = {
  name: string;
  tagline: string;
  monthlyPrice: number | null; // null = Free
  productLimit: string;
  features: string[];
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    tagline: "Try StoreHike at no cost.",
    monthlyPrice: null,
    productLimit: "Up to 10 products",
    features: [
      "One online store",
      "Manage orders & customers",
      "Cash on delivery & bank transfer",
      "Customizable store link",
      "Basic store branding (logo, accent color)",
    ],
  },
  {
    name: "Lite",
    tagline: "For sellers ready to leave DMs behind.",
    monthlyPrice: 3900,
    productLimit: "Up to 20 products",
    features: [
      "Everything in Free",
      "Card payments via Flutterwave",
      "Discount codes",
      "WhatsApp order messaging",
      "Sales dashboard & low-stock alerts",
      "Search-engine friendly storefront",
    ],
  },
  {
    name: "Basic",
    tagline: "For a growing catalogue.",
    monthlyPrice: 5200,
    productLimit: "Up to 100 products",
    features: [
      "Everything in Lite",
      "Product variants (size, colour, etc.)",
      "Full store customization (theme colour & font)",
      "Printable order invoices",
      "Shipping zones by state",
    ],
  },
  {
    name: "Growth",
    tagline: "For sellers scaling up.",
    monthlyPrice: 7600,
    productLimit: "Up to 1,000 products",
    features: ["Everything in Basic", "CSV product export", "Cross-device cart sync for customers", "Priority email support"],
    popular: true,
  },
  {
    name: "Business",
    tagline: "For established stores.",
    monthlyPrice: 11000,
    productLimit: "Unlimited products",
    features: ["Everything in Growth", "Unlimited products", "Fastest-priority support"],
  },
];

function formatNaira(n: number) {
  return `₦${Math.round(n).toLocaleString()}`;
}

export function PricingSection() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <section id="pricing" className="border-t border-gray-100 bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-semibold text-gray-900">Simple, honest pricing</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Start free. Upgrade as your catalogue grows.</p>

        <div className="mx-auto mt-8 flex w-fit items-center gap-1 rounded-full border border-gray-200 bg-white p-1">
          {(Object.keys(CYCLE_LABEL) as Cycle[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                cycle === c ? "bg-brand-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {CYCLE_LABEL[c]}
              {c !== "monthly" && <span className="ml-1 text-xs opacity-80">−{CYCLE_DISCOUNT[c] * 100}%</span>}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((plan) => {
            const isFree = plan.monthlyPrice === null;
            const effectiveMonthly = isFree ? 0 : plan.monthlyPrice! * (1 - CYCLE_DISCOUNT[cycle]);
            const billedTotal = isFree ? 0 : effectiveMonthly * CYCLE_MONTHS[cycle];

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl border bg-white p-5 transition-shadow duration-200 hover:shadow-card-hover ${
                  plan.popular ? "border-brand-600 shadow-card-hover" : "border-gray-200 shadow-card"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-medium text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{plan.tagline}</p>

                <div className="mt-4">
                  {isFree ? (
                    <p className="text-3xl font-bold text-gray-900">Free</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-gray-900">
                        {formatNaira(effectiveMonthly)}
                        <span className="text-sm font-normal text-gray-500">/mo</span>
                      </p>
                      {cycle !== "monthly" && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          Billed {formatNaira(billedTotal)} every {CYCLE_MONTHS[cycle]} months
                        </p>
                      )}
                    </>
                  )}
                </div>

                <p className="mt-3 text-sm font-medium text-gray-700">{plan.productLimit}</p>

                <Button href="/register" className="mt-4 w-full">
                  Get started
                </Button>

                <ul className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand-600">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
