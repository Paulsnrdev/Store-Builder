import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AnalyticsPage() {
  const store = await getCurrentStore();
  const canViewAnalytics = hasFeature(store.subscription, "ANALYTICS_DASHBOARD");

  if (!canViewAnalytics) {
    return (
      <div>
        <PageHeader title="Analytics" />
        <Card className="mt-6">
          <p className="text-sm text-gray-600">
            The analytics dashboard is available on the Business plan.{" "}
            <a href="/dashboard/billing" className="font-medium text-brand-600 hover:underline">
              Upgrade your plan
            </a>{" "}
            to unlock it.
          </p>
          <div className="mt-3">
            <Button href="/dashboard/billing">Upgrade</Button>
          </div>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [paidOrders, customers, discounts] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id, paidAt: { gte: chartStart }, status: { not: "REFUNDED" } },
      include: { items: true },
    }),
    prisma.customer.findMany({ where: { storeId: store.id }, select: { id: true, name: true, orders: { select: { id: true } } } }),
    prisma.discount.findMany({ where: { storeId: store.id }, orderBy: { usageCount: "desc" }, take: 5 }),
  ]);

  const revenueByMonth = new Map<string, number>();
  for (const order of paidOrders) {
    if (!order.paidAt) continue;
    const key = monthKey(order.paidAt);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(order.total));
  }
  const monthlyChart = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(chartStart.getFullYear(), chartStart.getMonth() + i, 1);
    return { label: d.toLocaleDateString("en-NG", { month: "short", year: "2-digit" }), amount: revenueByMonth.get(monthKey(d)) ?? 0 };
  });

  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  const productRevenue = new Map<string, { name: string; revenue: number; quantity: number }>();
  for (const order of paidOrders) {
    for (const item of order.items) {
      const key = item.productId ?? item.productName;
      const existing = productRevenue.get(key) ?? { name: item.productName, revenue: 0, quantity: 0 };
      existing.revenue += Number(item.total);
      existing.quantity += item.quantity;
      productRevenue.set(key, existing);
    }
  }
  const topProducts = Array.from(productRevenue.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const newCustomers = customers.filter((c) => c.orders.length === 1).length;
  const returningCustomers = customers.filter((c) => c.orders.length > 1).length;

  const paymentMethodCounts = paidOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.paymentMethod] = (acc[o.paymentMethod] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Analytics" description="The last 12 months, based on paid orders." />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase text-gray-500">Revenue (12mo)</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">₦{totalRevenue.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-gray-500">Average order value</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">₦{Math.round(avgOrderValue).toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-gray-500">Paid orders (12mo)</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{paidOrders.length}</p>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-gray-900">Revenue by month</h2>
        <div className="mt-4">
          <RevenueChart data={monthlyChart} />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-gray-900">Top products by revenue</h2>
          <div className="mt-3 divide-y divide-gray-100">
            {topProducts.map((p) => (
              <div key={p.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-900">{p.name}</span>
                <span className="text-gray-500">
                  ₦{p.revenue.toLocaleString()} · {p.quantity} sold
                </span>
              </div>
            ))}
            {topProducts.length === 0 && <p className="py-4 text-center text-sm text-gray-400">No sales yet.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-900">Customers</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">New (1 order)</span>
              <span className="font-medium text-gray-900">{newCustomers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Returning (2+ orders)</span>
              <span className="font-medium text-gray-900">{returningCustomers}</span>
            </div>
          </div>

          <h2 className="mt-5 text-sm font-semibold text-gray-900">Payment methods (12mo)</h2>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(paymentMethodCounts).map(([method, count]) => (
              <div key={method} className="flex justify-between">
                <span className="text-gray-600">{method.replace("_", " ")}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(paymentMethodCounts).length === 0 && <p className="text-gray-400">No paid orders yet.</p>}
          </div>
        </Card>
      </div>

      {discounts.length > 0 && (
        <Card className="mt-4">
          <h2 className="text-sm font-semibold text-gray-900">Top discount codes</h2>
          <div className="mt-3 divide-y divide-gray-100">
            {discounts.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-900">{d.code}</span>
                <span className="text-gray-500">{d.usageCount} uses</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
