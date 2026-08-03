import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { ShippingZoneForm } from "@/components/dashboard/shipping-zone-form";
import { updateShippingZone } from "@/lib/actions/shipping-zones";
import { PageHeader } from "@/components/ui/page-header";

export default async function EditShippingZonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getCurrentStore();
  const zone = await prisma.shippingZone.findFirst({ where: { id, storeId: store.id } });
  if (!zone) notFound();

  return (
    <div>
      <PageHeader title="Edit shipping zone" />
      <div className="mt-6">
        <ShippingZoneForm
          action={updateShippingZone.bind(null, zone.id)}
          initial={{
            name: zone.name,
            states: zone.states,
            rate: zone.rate.toString(),
            freeAbove: zone.freeAbove?.toString() ?? null,
          }}
        />
      </div>
    </div>
  );
}
