"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrderStatus } from "@/lib/actions/order-status";

export function PaymentStatusPoller({ orderId, initialStatus }: { orderId: string; initialStatus: string }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (initialStatus !== "PENDING" || attempts >= 10) return;
    const timer = setTimeout(async () => {
      const status = await getOrderStatus(orderId);
      if (status && status !== "PENDING") {
        router.refresh();
      } else {
        setAttempts((a) => a + 1);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [attempts, initialStatus, orderId, router]);

  if (initialStatus !== "PENDING") return null;

  return (
    <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      Confirming your payment...
    </p>
  );
}
