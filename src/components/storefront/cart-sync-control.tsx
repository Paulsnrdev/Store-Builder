"use client";

import { useState } from "react";
import { useCart } from "@/components/storefront/cart-context";

export function CartSyncControl() {
  const { linkedPhone, linkPhone, unlinkPhone, syncing } = useCart();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    const result = await linkPhone(phone);
    setMessage(result.restored ? "Cart restored from your other device." : "Cart will now sync to this number.");
  }

  if (linkedPhone) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
        <span>
          {syncing ? "Syncing..." : `Synced to ${linkedPhone}`} — use this number on another device to pick up this cart.
        </span>
        <button type="button" onClick={unlinkPhone} className="font-medium text-gray-700 underline transition-colors hover:text-gray-900">
          Unlink
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-md border border-dashed border-gray-300 p-3">
      <p className="text-xs text-gray-500">Shopping on another device too? Sync your cart to your phone number.</p>
      <form onSubmit={handleLink} className="mt-2 flex gap-2">
        <input
          type="tel"
          placeholder="+234..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm transition-colors focus:border-(--store-primary,#111827) focus:outline-none focus:ring-2 focus:ring-(--store-primary,#111827)/20"
        />
        <button
          type="submit"
          disabled={syncing || !phone.trim()}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {syncing ? "..." : "Sync"}
        </button>
      </form>
      {message && <p className="mt-1 text-xs text-green-700">{message}</p>}
    </div>
  );
}
