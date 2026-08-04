"use client";

import { useActionState } from "react";
import type { PlanFormState } from "@/lib/actions/admin-plans";

type Action = (prev: PlanFormState, formData: FormData) => Promise<PlanFormState>;

type Initial = {
  name: string;
  description: string | null;
  monthlyPrice: string;
  yearlyPrice: string;
  currency: string;
  productLimit: number | null;
  featureTier: number;
  isActive: boolean;
  sortOrder: number;
};

export function PlanForm({ action, initial }: { action: Action; initial?: Initial }) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Plan name</label>
        <input
          name="name"
          defaultValue={initial?.name}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Monthly price</label>
          <input
            name="monthlyPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.monthlyPrice ?? "0"}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Yearly price</label>
          <input
            name="yearlyPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.yearlyPrice ?? "0"}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <input
            name="currency"
            defaultValue={initial?.currency ?? "NGN"}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sort order</label>
          <input
            name="sortOrder"
            type="number"
            defaultValue={initial?.sortOrder ?? 0}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Product limit</label>
        <input
          name="productLimit"
          type="number"
          min="1"
          step="1"
          defaultValue={initial?.productLimit ?? ""}
          placeholder="Leave blank for unlimited"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">Max products a store on this plan can have. Blank = unlimited.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Feature tier</label>
        <select
          name="featureTier"
          defaultValue={initial?.featureTier ?? 0}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value={0}>0 — Free (no gated features)</option>
          <option value={1}>1 — Lite (card payments, WhatsApp messaging)</option>
          <option value={2}>2 — Basic (+ variants, theme font, invoices, shipping zones)</option>
          <option value={3}>3 — Growth (+ CSV export, cart sync)</option>
          <option value={4}>4 — Business</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Which gated features this plan unlocks — see FEATURE_TIER in src/lib/plan-features.ts.
        </p>
      </div>

      <label className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} />
        <span>Active — visible for admins to assign to businesses</span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

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
