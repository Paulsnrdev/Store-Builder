"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptStaffInvite } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptStaffInvite(token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div>
      <Button onClick={handleAccept} disabled={isPending} className="w-full">
        {isPending ? "Joining..." : "Accept invitation"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
