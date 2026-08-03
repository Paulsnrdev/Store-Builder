"use client";

import { useActionState } from "react";
import { adminLogin, type AdminLoginState } from "@/lib/actions/admin-auth";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(adminLogin, {} as AdminLoginState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-card">
        <h1 className="text-lg font-semibold text-gray-900">Admin</h1>
        <p className="mt-1 text-sm text-gray-500">Enter the admin password to continue.</p>

        <form action={formAction} className="mt-4 space-y-4">
          <input
            name="password"
            type="password"
            required
            autoFocus
            placeholder="Password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
