import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";
import { orderStatusLabel, orderStatusClass } from "@/lib/order-status-display";

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await getCurrentStore();
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, storeId: store.id },
    include: { orders: { orderBy: { createdAt: "desc" } } },
  });
  if (!customer) notFound();

  const totalSpent = customer.orders
    .filter((o) => PAID_STATUSES.includes(o.status))
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/customers" className="text-sm text-gray-500 hover:underline">
        ← Customers
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-500">{customer.phone}</p>
          {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
        </div>
        <Link
          href={whatsappLink(customer.phone, `Hi ${customer.name},`)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Message on WhatsApp
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Orders</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{customer.orders.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Total spent</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">₦{totalSpent.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customer.orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/orders/${order.id}`} className="font-medium text-gray-900 hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">₦{Number(order.total).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${orderStatusClass[order.status]}`}>
                    {orderStatusLabel[order.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {order.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </td>
              </tr>
            ))}
            {customer.orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
