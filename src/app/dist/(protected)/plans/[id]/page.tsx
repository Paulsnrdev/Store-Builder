import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updatePlan } from "@/lib/actions/admin-plans";
import { PlanForm } from "@/components/admin/plan-form";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Edit plan</h1>
      <div className="mt-6">
        <PlanForm
          action={updatePlan.bind(null, plan.id)}
          initial={{
            name: plan.name,
            description: plan.description,
            monthlyPrice: plan.monthlyPrice.toString(),
            yearlyPrice: plan.yearlyPrice.toString(),
            currency: plan.currency,
            productLimit: plan.productLimit,
            featureTier: plan.featureTier,
            isActive: plan.isActive,
            sortOrder: plan.sortOrder,
          }}
        />
      </div>
    </div>
  );
}
