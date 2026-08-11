"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrderStatus } from "@/lib/actions/order-status";

function formatCountdown(msLeft: number) {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Shown after checkout when the seller has no Paystack account of their own — payment goes
 * to a one-time pooled account instead. Confirmation is entirely webhook-driven (the seller
 * isn't expected to manually confirm anything), so this just polls order status and moves on
 * once it flips to PAID.
 */
export function BankTransferPayment({
  storeSlug,
  orderId,
  orderNumber,
  accountNumber,
  bankName,
  amount,
  expiresAt,
}: {
  storeSlug: string;
  orderId: string;
  orderNumber: string;
  accountNumber: string;
  bankName: string;
  amount: number;
  expiresAt: string;
}) {
  const router = useRouter();
  const expiry = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const msLeft = expiry - now;
  const expired = msLeft <= 0;

  useEffect(() => {
    if (expired) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [expired]);

  useEffect(() => {
    if (expired) return;
    const poll = setInterval(async () => {
      const status = await getOrderStatus(orderId);
      if (status === "PAID") router.push(`/shop/${storeSlug}/order/${orderNumber}`);
    }, 4000);
    return () => clearInterval(poll);
  }, [expired, orderId, orderNumber, storeSlug, router]);

  function checkNow() {
    setChecking(true);
    getOrderStatus(orderId).then((status) => {
      if (status === "PAID") {
        router.push(`/shop/${storeSlug}/order/${orderNumber}`);
      } else {
        setChecking(false);
      }
    });
  }

  function copyAccountNumber() {
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (expired) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-base font-semibold text-gray-900">This payment window has closed</p>
        <p className="mt-2 text-sm text-gray-500">The transfer account for order {orderNumber} has expired. Please place your order again.</p>
        <button
          type="button"
          onClick={() => router.push(`/shop/${storeSlug}`)}
          className="mt-4 rounded-lg bg-(--store-primary,#111827) px-4 py-2.5 text-sm font-semibold text-white"
        >
          Back to store
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
        Please make payment within <span className="font-semibold">{formatCountdown(msLeft)}</span> to avoid this order being cancelled.
      </div>

      <p className="mt-5 text-center text-sm text-gray-500">Transfer</p>
      <p className="text-center text-2xl font-bold text-gray-900">₦{amount.toLocaleString()}</p>

      <div className="mt-5 rounded-lg bg-gray-50 p-4 text-center">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{bankName}</p>
        <button type="button" onClick={copyAccountNumber} className="mt-1 text-2xl font-bold tracking-wide text-gray-900">
          {accountNumber}
        </button>
        <p className="mt-1 text-xs text-gray-400">{copied ? "Copied!" : "Tap to copy"}</p>
      </div>

      <p className="mt-4 text-center text-sm font-medium text-red-600">Please transfer exactly ₦{amount.toLocaleString()}</p>

      <button
        type="button"
        onClick={checkNow}
        disabled={checking}
        className="mt-5 w-full rounded-lg bg-(--store-primary,#111827) px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {checking ? "Checking..." : "I have made the transfer"}
      </button>
      <p className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        We&apos;ll confirm automatically once payment is received
      </p>
    </div>
  );
}
