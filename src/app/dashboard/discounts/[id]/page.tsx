import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";
import { DiscountForm } from "@/components/dashboard/discount-form";
import { updateDiscount } from "@/lib/actions/discount-codes";
import { PageHeader } from "@/components/ui/page-header";

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getCurrentStore();
  if (!hasFeature(store.subscription, "DISCOUNT_CODES")) redirect("/dashboard/discounts");

  const discount = await prisma.discount.findFirst({ where: { id, storeId: store.id } });
  if (!discount) notFound();

  return (
    <div>
      <PageHeader title="Edit discount" />
      <div className="mt-6">
        <DiscountForm
          action={updateDiscount.bind(null, discount.id)}
          initial={{
            code: discount.code,
            type: discount.type,
            value: discount.value.toString(),
            minOrderValue: discount.minOrderValue?.toString() ?? null,
            usageLimit: discount.usageLimit,
            startsAt: discount.startsAt ? discount.startsAt.toISOString().slice(0, 10) : null,
            expiresAt: discount.expiresAt ? discount.expiresAt.toISOString().slice(0, 10) : null,
            isActive: discount.isActive,
          }}
        />
      </div>
    </div>
  );
}
