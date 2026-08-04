"use client";

import { useActionState } from "react";
import { completeStoreSetup } from "@/lib/actions/auth";
import type { RegisterState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STORE_NICHES } from "@/lib/store-niches";

const initialState: RegisterState = {};

export function CompleteStoreForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(completeStoreSetup, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-gray-500">
        You&apos;re signed in as <span className="font-medium text-gray-700">{name}</span>. One more step — name your
        store.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700">Store name</label>
        <Input name="storeName" type="text" required placeholder="e.g. Chunkz" autoFocus className="mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">What do you sell?</label>
        <Select name="niche" required defaultValue="" className="mt-1">
          <option value="" disabled>
            Select a niche
          </option>
          {STORE_NICHES.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </Select>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating..." : "Create store"}
      </Button>
    </form>
  );
}
