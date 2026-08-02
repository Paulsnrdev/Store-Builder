"use client";

import { signOut } from "next-auth/react";

export default function SuspendedPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Store suspended</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Your store has been suspended and is no longer accessible. If you believe this is a mistake, please contact
        support.
      </p>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Sign out
      </button>
    </div>
  );
}
