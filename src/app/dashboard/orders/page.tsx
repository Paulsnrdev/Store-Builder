import Link from "next/link";
import { Prisma, OrderStatus, PaymentMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { orderStatusLabel, orderStatusClass, paymentMethodLabel } from "@/lib/order-status-display";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableShell, TableHead, TableBody, TableEmpty } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";

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
      <PageHeader title="Orders" />

      <form className="mt-4 flex flex-wrap items-center gap-3" method="get">
        <Input type="text" name="q" defaultValue={q} placeholder="Search order #, customer name or phone" className="w-72" />
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
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(q || status || payment) && (
          <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <TableShell className="mt-4">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </TableHead>
          <TableBody>
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
                  <StatusBadge tone={orderStatusClass[order.status]}>{orderStatusLabel[order.status]}</StatusBadge>
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
            {orders.length === 0 && <TableEmpty colSpan={7}>No orders found.</TableEmpty>}
          </TableBody>
        </table>
      </TableShell>
    </div>
  );
}
