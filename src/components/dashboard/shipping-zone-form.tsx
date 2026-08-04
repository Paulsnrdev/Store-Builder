"use client";

import { useActionState, useState } from "react";
import { NIGERIAN_ZONES } from "@/lib/nigerian-states";
import type { ShippingZoneFormState } from "@/lib/actions/shipping-zones";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Initial = {
  name: string;
  states: string[];
  rate: string;
  freeAbove: string | null;
};

const empty: Initial = { name: "", states: [], rate: "", freeAbove: null };
const initialState: ShippingZoneFormState = {};

export function ShippingZoneForm({
  action,
  initial = empty,
}: {
  action: (prev: ShippingZoneFormState, formData: FormData) => Promise<ShippingZoneFormState>;
  initial?: Initial;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.states));

  function toggle(state: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  }

  function toggleZone(states: readonly string[]) {
    const allSelected = states.every((state) => selected.has(state));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const state of states) {
        if (allSelected) next.delete(state);
        else next.add(state);
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="max-w-lg space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Zone name</label>
        <Input name="name" defaultValue={initial.name} required placeholder="e.g. Lagos, South West, Rest of Nigeria" className="mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Shipping rate (₦)</label>
          <Input name="rate" type="number" min="0" step="0.01" defaultValue={initial.rate} required className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Free above (₦)</label>
          <Input name="freeAbove" type="number" min="0" step="0.01" defaultValue={initial.freeAbove ?? ""} placeholder="Optional" className="mt-1" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">States in this zone</label>
          <span className="text-xs text-gray-400">{selected.size} selected</span>
        </div>
        <div className="mt-2 max-h-96 space-y-4 overflow-y-auto rounded-md border border-gray-200 p-3">
          {NIGERIAN_ZONES.map((zone) => {
            const allSelected = zone.states.every((state) => selected.has(state));
            return (
              <div key={zone.name}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-gray-500">{zone.name}</h4>
                  <button
                    type="button"
                    onClick={() => toggleZone(zone.states)}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    {allSelected ? "Clear" : "Select all"}
                  </button>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {zone.states.map((state) => (
                    <label key={state} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        name="states"
                        value={state}
                        checked={selected.has(state)}
                        onChange={() => toggle(state)}
                        className="accent-brand-600"
                      />
                      {state}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save zone"}
      </Button>
    </form>
  );
}
