"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrderStatus } from "@/lib/actions/order-status";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PaymentStatusPoller({
  orderId,
  initialStatus,
  expiresAt,
}: {
  orderId: string;
  initialStatus: string;
  /** When set (a dynamic bank-transfer account), polling continues until this time instead of a fixed attempt count, and a countdown is shown. */
  expiresAt?: Date | string | null;
}) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  // Read on the client only, in an effect, so server and first client render
  // match — Date.now() at module/render time would otherwise drift between
  // the server-rendered and hydrated markup and trip a hydration warning.
  const [now, setNow] = useState<number | null>(null);
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : null;

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const stillWaiting = expiresAtMs === null ? attempts < 10 : now === null || now < expiresAtMs;

  useEffect(() => {
    if (initialStatus !== "PENDING" || now === null || !stillWaiting) return;
    const timer = setTimeout(async () => {
      const status = await getOrderStatus(orderId);
      if (status && status !== "PENDING") {
        router.refresh();
        return;
      }
      setNow(Date.now());
      setAttempts((a) => a + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [attempts, initialStatus, orderId, router, stillWaiting, now]);

  if (initialStatus !== "PENDING") return null;

  let statusText = "Confirming your payment...";
  if (expiresAtMs !== null && now !== null) {
    statusText = stillWaiting ? `Confirming your payment... account expires in ${formatCountdown(expiresAtMs - now)}` : "This account has expired.";
  }

  return (
    <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      {statusText}
    </p>
  );
}
