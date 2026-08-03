import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { FilterSelect } from "@/components/dashboard/filter-select";

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  const where: Prisma.StoreWhereInput = {
    ...(status === "suspended" ? { isSuspended: true } : {}),
    ...(status === "active" ? { isSuspended: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const stores = await prisma.store.findMany({
    where,
    include: { user: true, subscription: { include: { plan: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Businesses</h1>

      <form className="mt-4 flex flex-wrap items-center gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search store name, slug, or owner email"
          className="w-80 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <FilterSelect name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </FilterSelect>
        <button type="submit" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Filter
        </button>
        {(q || status) && (
          <Link href="/admin/businesses" className="text-sm text-gray-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stores.map((store) => (
              <tr key={store.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/businesses/${store.id}`} className="font-medium text-gray-900 hover:underline">
                    {store.name}
                  </Link>
                  <div className="text-xs text-gray-400">/shop/{store.slug}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <div>{store.user.name}</div>
                  <div className="text-xs text-gray-400">{store.user.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {store.subscription ? (
                    `${store.subscription.plan.name} (${store.subscription.interval.toLowerCase()})`
                  ) : (
                    <span className="text-gray-400">No plan</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {store.isSuspended ? (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Suspended</span>
                  ) : store.isPublished ? (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Published</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">Unpublished</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {store.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/businesses/${store.id}`} className="font-medium text-gray-600 hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {stores.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No businesses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
