import { ShippingZoneForm } from "@/components/dashboard/shipping-zone-form";
import { createShippingZone } from "@/lib/actions/shipping-zones";
import { PageHeader } from "@/components/ui/page-header";

export default function NewShippingZonePage() {
  return (
    <div>
      <PageHeader title="New shipping zone" />
      <div className="mt-6">
        <ShippingZoneForm action={createShippingZone} />
      </div>
    </div>
  );
}
