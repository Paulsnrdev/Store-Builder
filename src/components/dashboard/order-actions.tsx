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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <Card>
      <h2 className="text-sm font-semibold text-gray-900">Actions</h2>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {canMarkPaid && (
          <Button size="sm" disabled={isPending} onClick={() => run(() => markOrderPaid(orderId))}>
            Mark as paid
          </Button>
        )}
        {canMarkProcessing && (
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(() => markOrderProcessing(orderId))}>
            Mark as processing
          </Button>
        )}
        {canMarkShipped && !showShipForm && (
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => setShowShipForm(true)}>
            Mark as shipped
          </Button>
        )}
        {canMarkDelivered && (
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(() => markOrderDelivered(orderId))}>
            Mark as delivered
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="danger"
            disabled={isPending}
            onClick={() => {
              if (!confirm("Cancel this order? Reserved stock will be restored.")) return;
              run(() => cancelOrder(orderId));
            }}
          >
            Cancel order
          </Button>
        )}
        {canRefund && (
          <Button
            size="sm"
            variant="danger"
            disabled={isPending}
            onClick={() => {
              if (!confirm("Mark this order as refunded? Stock will be restored.")) return;
              run(() => refundOrder(orderId));
            }}
          >
            Refund
          </Button>
        )}
      </div>

      {canMarkShipped && showShipForm && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
          <Input
            type="text"
            value={trackingNote}
            onChange={(e) => setTrackingNote(e.target.value)}
            placeholder="Tracking note (optional)"
            className="flex-1"
          />
          <Button size="sm" disabled={isPending} onClick={() => run(() => markOrderShipped(orderId, trackingNote))}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setShowShipForm(false)}>
            Cancel
          </Button>
        </div>
      )}
    </Card>
  );
}
