"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelSubscription } from "@/lib/actions/billing";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    if (!confirm("Cancel your subscription? You'll keep your plan's features until the end of the current billing period.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscription();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <Button variant="danger" size="sm" onClick={handleCancel} disabled={isPending}>
        {isPending ? "Canceling..." : "Cancel subscription"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
