"use client";

import { useActionState } from "react";
import { completeStoreSetup } from "@/lib/actions/auth";
import type { RegisterState } from "@/lib/actions/auth";

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
        <input
          name="storeName"
          type="text"
          required
          placeholder="e.g. Chunkz"
          autoFocus
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create store"}
      </button>
    </form>
  );
}
