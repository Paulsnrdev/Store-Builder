import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";
import { deleteDiscount } from "@/lib/actions/discount-codes";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell, TableHead, TableBody, TableEmpty } from "@/components/ui/table";

export default async function DiscountsPage() {
  const store = await getCurrentStore();
  const canUseDiscounts = hasFeature(store.subscription, "DISCOUNT_CODES");
  const discounts = await prisma.discount.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="Discount codes"
        description="Codes buyers can enter at checkout for a percentage or fixed amount off."
        action={
          canUseDiscounts ? (
            <Button href="/dashboard/discounts/new">New discount</Button>
          ) : (
            <Button href="/dashboard/billing" variant="secondary">
              Upgrade to add discounts
            </Button>
          )
        }
      />

      {!canUseDiscounts && (
        <Card className="mt-6">
          <p className="text-sm text-gray-600">
            Discount codes are available on the Growth plan and above.{" "}
            <a href="/dashboard/billing" className="font-medium text-brand-600 hover:underline">
              Upgrade your plan
            </a>{" "}
            to create your own.
          </p>
        </Card>
      )}

      <TableShell className="mt-6">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </TableHead>
          <TableBody>
            {discounts.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{d.code}</td>
                <td className="px-4 py-3 text-gray-700">
                  {d.type === "PERCENTAGE" ? `${Number(d.value)}%` : `₦${Number(d.value).toLocaleString()}`}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {d.usageCount}
                  {d.usageLimit ? ` / ${d.usageLimit}` : ""}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={d.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                    {d.isActive ? "Active" : "Inactive"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <a href={`/dashboard/discounts/${d.id}`} className="font-medium text-gray-600 hover:underline">
                      Edit
                    </a>
                    <DeleteButton action={deleteDiscount.bind(null, d.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {discounts.length === 0 && <TableEmpty colSpan={5}>No discount codes yet.</TableEmpty>}
          </TableBody>
        </table>
      </TableShell>
    </div>
  );
}
