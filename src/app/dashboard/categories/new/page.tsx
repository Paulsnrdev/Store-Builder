import { CategoryForm } from "@/components/dashboard/category-form";
import { createCategory } from "@/lib/actions/categories";
import { PageHeader } from "@/components/ui/page-header";

export default function NewCategoryPage() {
  return (
    <div>
      <PageHeader title="New category" />
      <div className="mt-6">
        <CategoryForm action={createCategory} />
      </div>
    </div>
  );
}
