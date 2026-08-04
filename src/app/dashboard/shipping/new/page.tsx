import { redirect } from "next/navigation";
import { getCurrentStore } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";
import { ShippingZoneForm } from "@/components/dashboard/shipping-zone-form";
import { createShippingZone } from "@/lib/actions/shipping-zones";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewShippingZonePage() {
  const store = await getCurrentStore();
  if (!hasFeature(store.subscription, "SHIPPING_ZONES")) redirect("/dashboard/shipping");

  return (
    <div>
      <PageHeader title="New shipping zone" />
      <div className="mt-6">
        <ShippingZoneForm action={createShippingZone} />
      </div>
    </div>
  );
}
