"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestWithdrawal } from "@/lib/actions/ledger";

export function WithdrawForm({ balance }: { balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestWithdrawal(Number(amount));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAmount("");
      router.refresh();
    });
  }

  if (balance <= 0) {
    return <p className="mt-3 text-sm text-gray-500">You don&apos;t have a balance to withdraw yet.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-start gap-2">
      <div>
        <input
          type="number"
          min="1"
          max={balance}
          step="0.01"
          required
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
        />
        {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      </div>
      <Button type="submit" variant="primary" size="md" disabled={isPending}>
        {isPending ? "Requesting..." : "Withdraw"}
      </Button>
    </form>
  );
}
