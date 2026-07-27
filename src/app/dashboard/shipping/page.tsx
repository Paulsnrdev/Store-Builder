import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { deleteShippingZone } from "@/lib/actions/shipping-zones";
import { DeleteButton } from "@/components/dashboard/delete-button";

export default async function ShippingPage() {
  const store = await getCurrentStore();
  const zones = await prisma.shippingZone.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Shipping zones</h1>
        <Link
          href="/dashboard/shipping/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New zone
        </Link>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Shipping cost at checkout is picked by matching the buyer&apos;s state to a zone. A state not covered by any zone ships free.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">States</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Free above</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {zones.map((zone) => (
              <tr key={zone.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{zone.name}</td>
                <td className="max-w-xs px-4 py-3 text-gray-500">
                  {zone.states.length > 4 ? `${zone.states.slice(0, 4).join(", ")} +${zone.states.length - 4} more` : zone.states.join(", ")}
                </td>
                <td className="px-4 py-3 text-gray-700">₦{Number(zone.rate).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{zone.freeAbove ? `₦${Number(zone.freeAbove).toLocaleString()}` : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link href={`/dashboard/shipping/${zone.id}`} className="font-medium text-gray-600 hover:underline">
                      Edit
                    </Link>
                    <DeleteButton action={deleteShippingZone.bind(null, zone.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No shipping zones yet — every state currently ships free.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
