"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSubscriptionStatus } from "@/lib/actions/billing";

/** Shown right after returning from Flutterwave, while we wait for the webhook to land. */
export function SubscriptionStatusPoller() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (attempts >= 10) return;
    const timer = setTimeout(async () => {
      const status = await getSubscriptionStatus();
      if (status === "ACTIVE") {
        router.refresh();
      } else {
        setAttempts((a) => a + 1);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [attempts, router]);

  return (
    <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      Confirming your payment...
    </p>
  );
}
