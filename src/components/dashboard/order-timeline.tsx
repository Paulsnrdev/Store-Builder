const STEPS = [
  { key: "PENDING", label: "Order placed" },
  { key: "PAID", label: "Paid" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

const RANK: Record<string, number> = { PENDING: 0, PAID: 1, PROCESSING: 2, SHIPPED: 3, DELIVERED: 4 };

function fmt(date: Date | null) {
  return date ? date.toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : null;
}

export function OrderTimeline({
  status,
  createdAt,
  paidAt,
  shippedAt,
  deliveredAt,
  updatedAt,
}: {
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  updatedAt: Date;
}) {
  const isTerminal = status === "CANCELLED" || status === "REFUNDED";
  const dates: Record<string, Date | null> = { PENDING: createdAt, PAID: paidAt, PROCESSING: null, SHIPPED: shippedAt, DELIVERED: deliveredAt };

  // While terminal, treat every step whose timestamp we actually have as reached; PROCESSING has no
  // timestamp of its own, so infer it only when a later step (shipped/delivered) proves it happened.
  const reachedRank = isTerminal ? (deliveredAt ? 4 : shippedAt ? 3 : paidAt ? 1 : 0) : RANK[status];

  return (
    <div>
      <ol className="space-y-3">
        {STEPS.map((step, i) => {
          const reached = i <= reachedRank;
          const date = fmt(dates[step.key]);
          return (
            <li key={step.key} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  reached ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {reached ? "✓" : ""}
              </span>
              <span className={reached ? "text-gray-900" : "text-gray-400"}>{step.label}</span>
              {date && <span className="text-xs text-gray-400">{date}</span>}
            </li>
          );
        })}
      </ol>
      {isTerminal && (
        <div className={`mt-3 rounded-md px-3 py-2 text-sm font-medium ${status === "CANCELLED" ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-700"}`}>
          {status === "CANCELLED" ? "Cancelled" : "Refunded"} — {fmt(updatedAt)}
        </div>
      )}
    </div>
  );
}
