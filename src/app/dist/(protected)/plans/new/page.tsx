import { createPlan } from "@/lib/actions/admin-plans";
import { PlanForm } from "@/components/admin/plan-form";

export default function NewPlanPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">New plan</h1>
      <div className="mt-6">
        <PlanForm action={createPlan} />
      </div>
    </div>
  );
}
