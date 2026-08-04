"use client";

import { useActionState, useState } from "react";
import { assignStorePlan, type AdminFormState } from "@/lib/actions/admin-stores";
import { addCycle, type Cycle } from "@/lib/billing-cycles";

type Plan = { id: string; name: string };

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function PlanAssignmentForm({
  storeId,
  plans,
  initial,
}: {
  storeId: string;
  plans: Plan[];
  initial?: { planId: string; interval: string; status: string; currentPeriodEnd: string | null };
}) {
  const [state, formAction, pending] = useActionState(assignStorePlan.bind(null, storeId), {} as AdminFormState);
  const initialInterval = (initial?.interval as Cycle) ?? "MONTHLY";
  // Mirrors how the real Flutterwave webhook computes currentPeriodEnd (addCycle(new Date(),
  // cycle)) — auto-filled here so the admin isn't guessing a date, but still editable for
  // backdating or syncing with an actual external subscription.
  const [periodEnd, setPeriodEnd] = useState(initial?.currentPeriodEnd || toDateInputValue(addCycle(new Date(), initialInterval)));

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Plan</label>
        <select
          name="planId"
          defaultValue={initial?.planId ?? ""}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select a plan
          </option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Billing interval</label>
          <select
            name="interval"
            defaultValue={initialInterval}
            onChange={(e) => setPeriodEnd(toDateInputValue(addCycle(new Date(), e.target.value as Cycle)))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="BIANNUAL">Bi-Annually</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            defaultValue={initial?.status ?? "ACTIVE"}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="TRIALING">Trialing</option>
            <option value="ACTIVE">Active</option>
            <option value="PAST_DUE">Past due</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Current period end</label>
        <input
          name="currentPeriodEnd"
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-400">Auto-set from the billing interval — adjust if it should differ.</p>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save plan"}
      </button>
    </form>
  );
}
