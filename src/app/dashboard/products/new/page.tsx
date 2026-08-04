import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { ProductForm } from "@/components/dashboard/product-form";
import { createProduct } from "@/lib/actions/products";
import { PageHeader } from "@/components/ui/page-header";
import { hasFeature } from "@/lib/plan-features";

export default async function NewProductPage() {
  const store = await getCurrentStore();
  const categories = await prisma.category.findMany({ where: { storeId: store.id }, orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <PageHeader title="New product" />
      <div className="mt-6">
        <ProductForm action={createProduct} categories={categories} canUseVariants={hasFeature(store.subscription, "PRODUCT_VARIANTS")} />
      </div>
    </div>
  );
}
