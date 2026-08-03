import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { ProductsTable, type ProductRow } from "@/components/dashboard/products-table";
import { getStockStatus } from "@/lib/inventory-status";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; stock?: string }>;
}) {
  const store = await getCurrentStore();
  const { q, category, status, stock } = await searchParams;

  const where: Prisma.ProductWhereInput = {
    storeId: store.id,
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
    ...(category ? { categoryId: category } : {}),
    ...(status === "active" ? { isActive: true } : status === "draft" ? { isActive: false } : {}),
  };

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { stockQuantity: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ where: { storeId: store.id }, orderBy: { sortOrder: "asc" } }),
  ]);

  const rows: ProductRow[] = products
    .map((p) => {
      // Variant-having products track stock per variant, not on the product itself.
      const effectiveStock = p.variants.length > 0 ? p.variants.reduce((sum, v) => sum + v.stockQuantity, 0) : p.stockQuantity;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price.toString(),
        isActive: p.isActive,
        trackInventory: p.trackInventory,
        stockQuantity: effectiveStock,
        categoryName: p.category?.name ?? null,
        imageUrl: p.images[0]?.url ?? null,
      };
    })
    .filter((row) => {
      if (!stock) return true;
      const stockStatus = getStockStatus(row.trackInventory, row.stockQuantity);
      if (stock === "out") return stockStatus === "out-of-stock";
      if (stock === "low") return stockStatus === "low-stock";
      return true;
    });

  return (
    <div>
      <PageHeader
        title="Products"
        action={
          <Button href="/dashboard/products/new">New product</Button>
        }
      />

      <form className="mt-4 flex flex-wrap items-center gap-3" method="get">
        <Input type="text" name="q" defaultValue={q} placeholder="Search name or SKU" className="w-auto" />
        <FilterSelect name="category" defaultValue={category ?? ""}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </FilterSelect>
        <FilterSelect name="stock" defaultValue={stock ?? ""}>
          <option value="">All stock levels</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </FilterSelect>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(q || category || status || stock) && (
          <Link href="/dashboard/products" className="text-sm text-gray-500 hover:underline">
            Clear
          </Link>
        )}
        <Link
          href="/dashboard/products/import-export"
          className="ml-auto text-sm font-medium text-gray-600 hover:underline"
        >
          Import / Export
        </Link>
      </form>

      <div className="mt-4">
        <ProductsTable products={rows} />
      </div>
    </div>
  );
}
