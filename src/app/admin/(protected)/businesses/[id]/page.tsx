import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateStoreDetailsAdmin, deleteStoreAdmin } from "@/lib/actions/admin-stores";
import { BusinessDetailsForm } from "@/components/admin/business-details-form";
import { SuspendControl } from "@/components/admin/suspend-control";
import { PlanAssignmentForm } from "@/components/admin/plan-assignment-form";
import { DeleteButton } from "@/components/dashboard/delete-button";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [store, plans] = await Promise.all([
    prisma.store.findUnique({
      where: { id },
      include: { user: true, subscription: { include: { plan: true } } },
    }),
    prisma.plan.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!store) notFound();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{store.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Owned by {store.user.name} ({store.user.email}) &middot; /shop/{store.slug}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-900">Store details</h2>
        <div className="mt-3">
          <BusinessDetailsForm
            action={updateStoreDetailsAdmin.bind(null, store.id)}
            initial={{
              name: store.name,
              email: store.email,
              phone: store.phone,
              address: store.address,
              description: store.description,
              isPublished: store.isPublished,
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900">Subscription</h2>
        <div className="mt-3">
          <PlanAssignmentForm
            storeId={store.id}
            plans={plans}
            initial={
              store.subscription
                ? {
                    planId: store.subscription.planId,
                    interval: store.subscription.interval,
                    status: store.subscription.status,
                    currentPeriodEnd: store.subscription.currentPeriodEnd
                      ? store.subscription.currentPeriodEnd.toISOString().slice(0, 10)
                      : null,
                  }
                : undefined
            }
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900">Access</h2>
        <div className="mt-3">
          <SuspendControl storeId={store.id} isSuspended={store.isSuspended} reason={store.suspendedReason} />
        </div>
      </section>

      <section className="border-t border-gray-200 pt-6">
        <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-gray-500">
          Permanently deletes this store and all its products, orders, and customers. The owner&apos;s login is not affected.
        </p>
        <div className="mt-3">
          <DeleteButton action={deleteStoreAdmin.bind(null, store.id)} label="Delete store" />
        </div>
      </section>
    </div>
  );
}
