import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { getStockStatus } from "@/lib/inventory-status";
import { orderStatusLabel, orderStatusClass } from "@/lib/order-status-display";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DashboardHomePage() {
  const store = await getCurrentStore();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const chartStart = new Date(startOfToday);
  chartStart.setDate(chartStart.getDate() - 29);

  const [todayOrdersCount, monthRevenueOrders, pendingOrders, chartOrders, products] = await Promise.all([
    prisma.order.count({ where: { storeId: store.id, createdAt: { gte: startOfToday } } }),
    prisma.order.findMany({
      where: { storeId: store.id, paidAt: { gte: startOfMonth } },
      select: { total: true },
    }),
    prisma.order.findMany({
      where: { storeId: store.id, status: { in: ["PENDING", "PAID"] } },
      include: { customer: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.order.findMany({
      where: { storeId: store.id, paidAt: { gte: chartStart } },
      select: { paidAt: true, total: true },
    }),
    prisma.product.findMany({
      where: { storeId: store.id },
      include: { variants: { select: { stockQuantity: true } } },
    }),
  ]);

  const revenueThisMonth = monthRevenueOrders.reduce((sum, o) => sum + Number(o.total), 0);

  const lowStockProducts = products
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.variants.length > 0 ? p.variants.reduce((sum, v) => sum + v.stockQuantity, 0) : p.stockQuantity,
      status: getStockStatus(
        p.trackInventory,
        p.variants.length > 0 ? p.variants.reduce((sum, v) => sum + v.stockQuantity, 0) : p.stockQuantity
      ),
    }))
    .filter((p) => p.status === "low-stock" || p.status === "out-of-stock");

  const revenueByDay = new Map<string, number>();
  for (const order of chartOrders) {
    if (!order.paidAt) continue;
    const key = dayKey(order.paidAt);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + Number(order.total));
  }
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(chartStart);
    day.setDate(day.getDate() + i);
    return { label: day.toLocaleDateString("en-NG", { day: "numeric", month: "short" }), amount: revenueByDay.get(dayKey(day)) ?? 0 };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
      <p className="mt-1 text-sm text-gray-500">{store.name}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Today&apos;s orders</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{todayOrdersCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Revenue this month</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">₦{revenueThisMonth.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Pending orders</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{pendingOrders.length}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Revenue — last 30 days</h2>
        <div className="mt-4">
          <RevenueChart data={chartData} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Orders needing action</h2>
            <Link href="/dashboard/orders" className="text-xs text-gray-500 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 divide-y divide-gray-100">
            {pendingOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between py-2 text-sm hover:bg-gray-50"
              >
                <div>
                  <span className="font-medium text-gray-900">{order.orderNumber}</span>
                  <span className="ml-2 text-gray-500">{order.customer.name}</span>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${orderStatusClass[order.status]}`}>
                  {orderStatusLabel[order.status]}
                </span>
              </Link>
            ))}
            {pendingOrders.length === 0 && <p className="py-4 text-center text-sm text-gray-400">Nothing needs action.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Low stock alerts</h2>
            <Link href="/dashboard/products" className="text-xs text-gray-500 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 divide-y divide-gray-100">
            {lowStockProducts.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/dashboard/products/${p.id}`} className="flex items-center justify-between py-2 text-sm hover:bg-gray-50">
                <span className="text-gray-900">{p.name}</span>
                <span className={p.status === "out-of-stock" ? "text-red-600" : "text-amber-600"}>{p.stock} left</span>
              </Link>
            ))}
            {lowStockProducts.length === 0 && <p className="py-4 text-center text-sm text-gray-400">Stock levels look healthy.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
