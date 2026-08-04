import { redirect } from "next/navigation";
import { getCurrentStore } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";
import { DiscountForm } from "@/components/dashboard/discount-form";
import { createDiscount } from "@/lib/actions/discount-codes";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewDiscountPage() {
  const store = await getCurrentStore();
  if (!hasFeature(store.subscription, "DISCOUNT_CODES")) redirect("/dashboard/discounts");

  return (
    <div>
      <PageHeader title="New discount" />
      <div className="mt-6">
        <DiscountForm action={createDiscount} />
      </div>
    </div>
  );
}
