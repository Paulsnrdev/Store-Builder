import Link from "next/link";
import { Prisma, OrderStatus, PaymentMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { orderStatusLabel, orderStatusClass, paymentMethodLabel } from "@/lib/order-status-display";
import { FilterSelect } from "@/components/dashboard/filter-select";

const STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const PAYMENT_METHODS = ["FLUTTERWAVE", "BANK_TRANSFER", "CASH_ON_DELIVERY"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string }>;
}) {
  const store = await getCurrentStore();
  const { q, status, payment } = await searchParams;

  const where: Prisma.OrderWhereInput = {
    storeId: store.id,
    ...(status && STATUSES.includes(status) ? { status: status as OrderStatus } : {}),
    ...(payment && PAYMENT_METHODS.includes(payment) ? { paymentMethod: payment as PaymentMethod } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>

      <form className="mt-4 flex flex-wrap items-center gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search order #, customer name or phone"
          className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <FilterSelect name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {orderStatusLabel[s]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="payment" defaultValue={payment ?? ""}>
          <option value="">All payment methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {paymentMethodLabel[m]}
            </option>
          ))}
        </FilterSelect>
        <button type="submit" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Filter
        </button>
        {(q || status || payment) && (
          <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/orders/${order.id}`} className="font-medium text-gray-900 hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <div>{order.customer.name}</div>
                  <div className="text-xs text-gray-400">{order.customer.phone}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">₦{Number(order.total).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${orderStatusClass[order.status]}`}>
                    {orderStatusLabel[order.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{paymentMethodLabel[order.paymentMethod]}</td>
                <td className="px-4 py-3 text-gray-500">{order.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/orders/${order.id}`} className="font-medium text-gray-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
