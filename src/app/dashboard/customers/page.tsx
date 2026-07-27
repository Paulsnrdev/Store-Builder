import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const store = await getCurrentStore();
  const { q } = await searchParams;

  const where: Prisma.CustomerWhereInput = {
    storeId: store.id,
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const customers = await prisma.customer.findMany({
    where,
    include: { orders: { select: { total: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      orderCount: c.orders.length,
      totalSpent: c.orders.filter((o) => PAID_STATUSES.includes(o.status)).reduce((sum, o) => sum + Number(o.total), 0),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>

      <form className="mt-4 flex flex-wrap items-center gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name or phone"
          className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Search
        </button>
        {q && (
          <Link href="/dashboard/customers" className="text-sm text-gray-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Total spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/customers/${c.id}`} className="font-medium text-gray-900 hover:underline">
                    {c.name}
                  </Link>
                  <div className="text-xs text-gray-400">{c.phone}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">{c.orderCount}</td>
                <td className="px-4 py-3 text-gray-700">₦{c.totalSpent.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
