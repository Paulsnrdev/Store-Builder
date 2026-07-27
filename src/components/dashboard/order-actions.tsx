"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markOrderPaid,
  markOrderProcessing,
  markOrderShipped,
  markOrderDelivered,
  cancelOrder,
  refundOrder,
} from "@/lib/actions/order-management";

type Props = {
  orderId: string;
  status: string;
  paymentMethod: string;
};

export function OrderActions({ orderId, status, paymentMethod }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingNote, setTrackingNote] = useState("");

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  const canMarkPaid = status === "PENDING" && paymentMethod !== "PAYSTACK";
  const canMarkProcessing = status === "PAID";
  const canMarkShipped = status === "PAID" || status === "PROCESSING";
  const canMarkDelivered = status === "SHIPPED";
  const canCancel = status !== "DELIVERED" && status !== "CANCELLED" && status !== "REFUNDED";
  const canRefund = status !== "PENDING" && status !== "CANCELLED" && status !== "REFUNDED";

  const hasActions = canMarkPaid || canMarkProcessing || canMarkShipped || canMarkDelivered || canCancel || canRefund;
  if (!hasActions) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Actions</h2>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {canMarkPaid && (
          <button
            disabled={isPending}
            onClick={() => run(() => markOrderPaid(orderId))}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Mark as paid
          </button>
        )}
        {canMarkProcessing && (
          <button
            disabled={isPending}
            onClick={() => run(() => markOrderProcessing(orderId))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Mark as processing
          </button>
        )}
        {canMarkShipped && !showShipForm && (
          <button
            disabled={isPending}
            onClick={() => setShowShipForm(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Mark as shipped
          </button>
        )}
        {canMarkDelivered && (
          <button
            disabled={isPending}
            onClick={() => run(() => markOrderDelivered(orderId))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Mark as delivered
          </button>
        )}
        {canCancel && (
          <button
            disabled={isPending}
            onClick={() => {
              if (!confirm("Cancel this order? Reserved stock will be restored.")) return;
              run(() => cancelOrder(orderId));
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-red-600 disabled:opacity-50"
          >
            Cancel order
          </button>
        )}
        {canRefund && (
          <button
            disabled={isPending}
            onClick={() => {
              if (!confirm("Mark this order as refunded? Stock will be restored.")) return;
              run(() => refundOrder(orderId));
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-red-600 disabled:opacity-50"
          >
            Refund
          </button>
        )}
      </div>

      {canMarkShipped && showShipForm && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
          <input
            type="text"
            value={trackingNote}
            onChange={(e) => setTrackingNote(e.target.value)}
            placeholder="Tracking note (optional)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            disabled={isPending}
            onClick={() => run(() => markOrderShipped(orderId, trackingNote))}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            disabled={isPending}
            onClick={() => setShowShipForm(false)}
            className="text-sm text-gray-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
