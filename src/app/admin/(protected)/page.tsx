import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const [totalStores, suspendedStores, totalPlans, activeSubscriptions] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { isSuspended: true } }),
    prisma.plan.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Admin overview</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Total businesses</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{totalStores}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Suspended</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{suspendedStores}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Plans</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{totalPlans}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Active subscriptions</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{activeSubscriptions}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <Link href="/admin/businesses" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Manage businesses
        </Link>
        <Link href="/admin/plans" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Manage plans
        </Link>
      </div>
    </div>
  );
}
