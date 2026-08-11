import { requireStoreOwner } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { WithdrawForm } from "@/components/dashboard/withdraw-form";

const REASON_LABEL: Record<string, string> = {
  ORDER_PAYMENT: "Order payment",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export default async function BalancePage() {
  const store = await requireStoreOwner();

  const entries = await prisma.ledgerEntry.findMany({
    where: { storeId: store.id },
    include: { order: { select: { orderNumber: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const balance = Number(store.ledgerBalance);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance"
        description="Money collected on your behalf through StoreHike's payment account — for sellers without their own Paystack account."
      />

      <Card>
        <h2 className="text-sm font-semibold text-gray-900">Available balance</h2>
        <p className="mt-2 text-2xl font-bold text-gray-900">₦{balance.toLocaleString()}</p>
        <WithdrawForm balance={balance} />
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-gray-900">History</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No activity yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-500">{entry.createdAt.toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-900">{REASON_LABEL[entry.reason] ?? entry.reason}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.order?.orderNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{STATUS_LABEL[entry.status] ?? entry.status}</td>
                    <td className={`px-4 py-3 text-right font-medium ${entry.type === "CREDIT" ? "text-green-700" : "text-gray-900"}`}>
                      {entry.type === "CREDIT" ? "+" : "−"}₦{Number(entry.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
