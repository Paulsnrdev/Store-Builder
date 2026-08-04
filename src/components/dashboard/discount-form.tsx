"use client";

import { useActionState } from "react";
import type { DiscountFormState } from "@/lib/actions/discount-codes";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Initial = {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  minOrderValue: string | null;
  usageLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

const empty: Initial = {
  code: "",
  type: "PERCENTAGE",
  value: "",
  minOrderValue: null,
  usageLimit: null,
  startsAt: null,
  expiresAt: null,
  isActive: true,
};

const initialState: DiscountFormState = {};

export function DiscountForm({
  action,
  initial = empty,
}: {
  action: (prev: DiscountFormState, formData: FormData) => Promise<DiscountFormState>;
  initial?: Initial;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-lg space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Code</label>
        <Input
          name="code"
          defaultValue={initial.code}
          required
          placeholder="e.g. WELCOME10"
          className="mt-1 uppercase"
          style={{ textTransform: "uppercase" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <Select name="type" defaultValue={initial.type} className="mt-1">
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FIXED">Fixed amount off (₦)</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Value</label>
          <Input name="value" type="number" min="0" step="0.01" defaultValue={initial.value} required className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Minimum order (₦)</label>
          <Input
            name="minOrderValue"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initial.minOrderValue ?? ""}
            placeholder="Optional"
            className="mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Usage limit</label>
          <Input
            name="usageLimit"
            type="number"
            min="1"
            step="1"
            defaultValue={initial.usageLimit ?? ""}
            placeholder="Unlimited"
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Starts at</label>
          <Input name="startsAt" type="date" defaultValue={initial.startsAt ?? ""} className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Expires at</label>
          <Input name="expiresAt" type="date" defaultValue={initial.expiresAt ?? ""} className="mt-1" />
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={initial.isActive} className="accent-brand-600" />
        <span>Active</span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save discount"}
      </Button>
    </form>
  );
}
