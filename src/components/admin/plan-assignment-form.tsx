"use client";

import { useActionState } from "react";
import { assignStorePlan, type AdminFormState } from "@/lib/actions/admin-stores";

type Plan = { id: string; name: string };

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
            defaultValue={initial?.interval ?? "MONTHLY"}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="BIANNUAL">Every 6 months</option>
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
          defaultValue={initial?.currentPeriodEnd ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
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
