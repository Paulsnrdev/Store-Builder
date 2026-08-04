import { requireStoreOwner } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PlanPicker } from "@/components/dashboard/plan-picker";
import { CancelSubscriptionButton } from "@/components/dashboard/cancel-subscription-button";
import { SubscriptionStatusPoller } from "@/components/dashboard/subscription-status-poller";
import { isSubscriptionEntitled, FREE_PRODUCT_LIMIT } from "@/lib/plan-limits";
import { CYCLE_LABEL } from "@/lib/billing-cycles";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const store = await requireStoreOwner();

  const [plans, productCount] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.product.count({ where: { storeId: store.id } }),
  ]);

  const subscription = store.subscription;
  const entitled = isSubscriptionEntitled(subscription);
  const currentPlanName = entitled ? subscription!.plan.name : "Free";
  const currentLimit = entitled ? subscription!.plan.productLimit : FREE_PRODUCT_LIMIT;

  const awaitingConfirmation = status === "successful" && (!entitled || subscription?.status !== "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your StoreHike plan." />

      <Card>
        <h2 className="text-sm font-semibold text-gray-900">Current plan</h2>
        <p className="mt-2 text-2xl font-bold text-gray-900">{currentPlanName}</p>

        {awaitingConfirmation && <SubscriptionStatusPoller />}

        {subscription && subscription.currentPeriodEnd && (
          <p className="mt-1 text-sm text-gray-500">
            {subscription.status === "CANCELED"
              ? `Canceled — features stay active until ${subscription.currentPeriodEnd.toLocaleDateString()}`
              : `Renews ${CYCLE_LABEL[subscription.interval].toLowerCase()}, next charge ${subscription.currentPeriodEnd.toLocaleDateString()}`}
          </p>
        )}

        <p className="mt-3 text-sm text-gray-600">
          {productCount} product{productCount === 1 ? "" : "s"} used
          {currentLimit == null ? " (unlimited)" : ` of ${currentLimit}`}
        </p>

        {entitled && subscription!.status !== "CANCELED" && (
          <div className="mt-4">
            <CancelSubscriptionButton />
          </div>
        )}
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-gray-900">Change plan</h2>
        <div className="mt-3">
          <PlanPicker
            plans={plans.map((p) => ({
              slug: p.slug,
              name: p.name,
              monthlyPrice: Number(p.monthlyPrice),
              productLimit: p.productLimit,
            }))}
            currentPlanSlug={entitled ? subscription!.plan.slug : null}
          />
        </div>
      </div>
    </div>
  );
}
