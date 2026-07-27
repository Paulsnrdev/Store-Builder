import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { ProductForm } from "@/components/dashboard/product-form";
import { createProduct } from "@/lib/actions/products";

export default async function NewProductPage() {
  const store = await getCurrentStore();
  const categories = await prisma.category.findMany({ where: { storeId: store.id }, orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">New product</h1>
      <div className="mt-6">
        <ProductForm action={createProduct} categories={categories} />
      </div>
    </div>
  );
}
