"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { subscribeToPlan } from "@/lib/actions/billing";
import { CYCLE_LABEL, CYCLE_DISCOUNT, cycleAmount, type Cycle } from "@/lib/billing-cycles";

type PlanOption = { slug: string; name: string; monthlyPrice: number; productLimit: number | null };

export function PlanPicker({ plans, currentPlanSlug }: { plans: PlanOption[]; currentPlanSlug: string | null }) {
  const [cycle, setCycle] = useState<Cycle>("MONTHLY");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubscribe(slug: string) {
    setError(null);
    setPendingSlug(slug);
    startTransition(async () => {
      const result = await subscribeToPlan(slug, cycle);
      if (!result.ok) {
        setError(result.error);
        setPendingSlug(null);
        return;
      }
      window.location.href = result.paymentLink;
    });
  }

  return (
    <div>
      <div className="flex w-fit items-center gap-1 rounded-full border border-gray-200 bg-white p-1">
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
            {c !== "MONTHLY" && <span className="ml-1 text-xs opacity-80">−{CYCLE_DISCOUNT[c] * 100}%</span>}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentPlanSlug;
          const amount = cycleAmount(plan.monthlyPrice, cycle);
          return (
            <div key={plan.slug} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-card">
              <h3 className="font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                ₦{amount.toLocaleString()}
                <span className="text-sm font-normal text-gray-500"> / {CYCLE_LABEL[cycle].toLowerCase()}</span>
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {plan.productLimit == null ? "Unlimited products" : `Up to ${plan.productLimit} products`}
              </p>
              <div className="mt-4">
                {isCurrent ? (
                  <Button variant="secondary" size="sm" disabled className="w-full">
                    Current plan
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleSubscribe(plan.slug)}
                    disabled={isPending && pendingSlug === plan.slug}
                    className="w-full"
                  >
                    {isPending && pendingSlug === plan.slug ? "Redirecting..." : "Subscribe"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
