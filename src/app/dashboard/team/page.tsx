import { prisma } from "@/lib/prisma";
import { requireStoreOwner } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";
import { removeStaffMember } from "@/lib/actions/team";
import { InviteStaffForm } from "@/components/dashboard/invite-staff-form";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function TeamPage() {
  const store = await requireStoreOwner();
  const canUseStaffAccounts = hasFeature(store.subscription, "STAFF_ACCOUNTS");

  if (!canUseStaffAccounts) {
    return (
      <div>
        <PageHeader title="Team" />
        <Card className="mt-6">
          <p className="text-sm text-gray-600">
            Multiple staff accounts are available on the Business plan.{" "}
            <a href="/dashboard/billing" className="font-medium text-brand-600 hover:underline">
              Upgrade your plan
            </a>{" "}
            to invite people to help manage your store.
          </p>
          <div className="mt-3">
            <Button href="/dashboard/billing">Upgrade</Button>
          </div>
        </Card>
      </div>
    );
  }

  const members = await prisma.storeMember.findMany({ where: { storeId: store.id }, include: { user: true }, orderBy: { invitedAt: "desc" } });

  return (
    <div>
      <PageHeader title="Team" description="Invite people to help manage this store's dashboard." />

      <Card className="mt-6">
        <InviteStaffForm />
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-gray-900">Members</h2>
        <div className="mt-3 divide-y divide-gray-100">
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-gray-900">{store.email ?? "You"} (owner)</span>
            <StatusBadge tone="bg-brand-50 text-brand-700">Owner</StatusBadge>
          </div>
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-900">{m.user?.name ?? m.email}</span>
              <div className="flex items-center gap-3">
                <StatusBadge tone={m.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                  {m.status === "ACTIVE" ? "Active" : "Invited"}
                </StatusBadge>
                <DeleteButton action={removeStaffMember.bind(null, m.id)} label="Remove" />
              </div>
            </div>
          ))}
          {members.length === 0 && <p className="py-4 text-center text-sm text-gray-400">No staff invited yet.</p>}
        </div>
      </Card>
    </div>
  );
}
