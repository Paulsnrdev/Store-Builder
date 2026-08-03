import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { togglePlanActive, deletePlan } from "@/lib/actions/admin-plans";
import { DeleteButton } from "@/components/dashboard/delete-button";

export default async function AdminPlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Plans</h1>
        <Link href="/dist/plans/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          New plan
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Monthly</th>
              <th className="px-4 py-3">Yearly</th>
              <th className="px-4 py-3">Subscribers</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-3">
                  <Link href={`/dist/plans/${plan.id}`} className="font-medium text-gray-900 hover:underline">
                    {plan.name}
                  </Link>
                  {plan.description && <div className="text-xs text-gray-400">{plan.description}</div>}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {plan.currency} {Number(plan.monthlyPrice).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {plan.currency} {Number(plan.yearlyPrice).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-500">{plan._count.subscriptions}</td>
                <td className="px-4 py-3">
                  <form action={togglePlanActive.bind(null, plan.id)}>
                    <button
                      type="submit"
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        plan.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link href={`/dist/plans/${plan.id}`} className="font-medium text-gray-600 hover:underline">
                      Edit
                    </Link>
                    {plan._count.subscriptions === 0 ? (
                      <DeleteButton action={deletePlan.bind(null, plan.id)} />
                    ) : (
                      <span className="text-xs text-gray-400">In use</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No plans yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
