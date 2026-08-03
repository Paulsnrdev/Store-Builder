import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { CategoryForm } from "@/components/dashboard/category-form";
import { updateCategory } from "@/lib/actions/categories";
import { PageHeader } from "@/components/ui/page-header";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getCurrentStore();
  const category = await prisma.category.findFirst({ where: { id, storeId: store.id } });
  if (!category) notFound();

  return (
    <div>
      <PageHeader title="Edit category" />
      <div className="mt-6">
        <CategoryForm
          action={updateCategory.bind(null, category.id)}
          initial={{ name: category.name, imageUrl: category.imageUrl, sortOrder: category.sortOrder }}
        />
      </div>
    </div>
  );
}
