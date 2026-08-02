"use client";

import { useActionState } from "react";
import { suspendStore, activateStore, type AdminFormState } from "@/lib/actions/admin-stores";

export function SuspendControl({
  storeId,
  isSuspended,
  reason,
}: {
  storeId: string;
  isSuspended: boolean;
  reason: string | null;
}) {
  const [state, formAction, pending] = useActionState(suspendStore.bind(null, storeId), {} as AdminFormState);

  if (isSuspended) {
    return (
      <div className="space-y-3">
        {reason && <p className="text-sm text-gray-500">Reason: {reason}</p>}
        <form action={activateStore.bind(null, storeId)}>
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            Reactivate store
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Suspend this store? The merchant loses dashboard access and the storefront goes offline.")) {
          e.preventDefault();
        }
      }}
      className="max-w-md space-y-3"
    >
      <textarea
        name="reason"
        placeholder="Reason for suspension (optional)"
        rows={2}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Suspending..." : "Suspend store"}
      </button>
    </form>
  );
}
