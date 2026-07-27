import { ShippingZoneForm } from "@/components/dashboard/shipping-zone-form";
import { createShippingZone } from "@/lib/actions/shipping-zones";

export default function NewShippingZonePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">New shipping zone</h1>
      <div className="mt-6">
        <ShippingZoneForm action={createShippingZone} />
      </div>
    </div>
  );
}
