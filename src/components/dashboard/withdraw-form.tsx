"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestWithdrawal, getWithdrawalStatus } from "@/lib/actions/ledger";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

export function WithdrawForm({ balance }: { balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<{ reference: string; status: "PENDING" | "COMPLETED" | "FAILED" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const pollRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; stop: boolean }>({ timer: null, stop: false });

  useEffect(() => {
    return () => {
      pollRef.current.stop = true;
      if (pollRef.current.timer) clearTimeout(pollRef.current.timer);
    };
  }, []);

  function pollStatus(reference: string, deadline: number) {
    pollRef.current.timer = setTimeout(async () => {
      if (pollRef.current.stop) return;
      const status = await getWithdrawalStatus(reference);
      if (pollRef.current.stop) return;

      if (status && status !== "PENDING") {
        setTracking({ reference, status });
        router.refresh();
        return;
      }
      if (Date.now() >= deadline) return; // Give up silently — the history table below still updates once the webhook lands.
      pollStatus(reference, deadline);
    }, POLL_INTERVAL_MS);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTracking(null);
    startTransition(async () => {
      const result = await requestWithdrawal(Number(amount));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAmount("");
      router.refresh();

      if (result.status === "PENDING") {
        pollRef.current.stop = false;
        setTracking({ reference: result.reference, status: "PENDING" });
        pollStatus(result.reference, Date.now() + POLL_TIMEOUT_MS);
      } else {
        setTracking({ reference: result.reference, status: "COMPLETED" });
      }
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
        {tracking?.status === "PENDING" && <p className="mt-1.5 text-xs font-medium text-gray-500">Processing your withdrawal…</p>}
        {tracking?.status === "COMPLETED" && <p className="mt-1.5 text-xs font-medium text-green-700">Withdrawal completed.</p>}
        {tracking?.status === "FAILED" && <p className="mt-1.5 text-xs font-medium text-red-600">Withdrawal failed — funds returned to your balance.</p>}
      </div>
      <Button type="submit" variant="primary" size="md" disabled={isPending}>
        {isPending ? "Requesting..." : "Withdraw"}
      </Button>
    </form>
  );
}
