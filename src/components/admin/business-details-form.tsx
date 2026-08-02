"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/lib/actions/admin-stores";

type Action = (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;

type Initial = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  isPublished: boolean;
};

export function BusinessDetailsForm({ action, initial }: { action: Action; initial: Initial }) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <label className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={initial.isPublished} />
        <span>Published</span>
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700">Store name</label>
        <input
          name="name"
          defaultValue={initial.name}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          name="description"
          defaultValue={initial.description ?? ""}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            name="phone"
            defaultValue={initial.phone ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={initial.email ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input
          name="address"
          defaultValue={initial.address ?? ""}
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
        {pending ? "Saving..." : "Save details"}
      </button>
    </form>
  );
}
