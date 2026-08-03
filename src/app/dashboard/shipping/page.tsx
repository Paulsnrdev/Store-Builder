import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { deleteShippingZone } from "@/lib/actions/shipping-zones";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TableShell, TableHead, TableBody, TableEmpty } from "@/components/ui/table";

export default async function ShippingPage() {
  const store = await getCurrentStore();
  const zones = await prisma.shippingZone.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="Shipping zones"
        description="Shipping cost at checkout is picked by matching the buyer's state to a zone. A state not covered by any zone ships free."
        action={<Button href="/dashboard/shipping/new">New zone</Button>}
      />

      <TableShell className="mt-6">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">States</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Free above</th>
              <th className="px-4 py-3" />
            </tr>
          </TableHead>
          <TableBody>
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
            {zones.length === 0 && <TableEmpty colSpan={5}>No shipping zones yet — every state currently ships free.</TableEmpty>}
          </TableBody>
        </table>
      </TableShell>
    </div>
  );
}
