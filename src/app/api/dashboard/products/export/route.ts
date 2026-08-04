import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { toCsv } from "@/lib/csv";
import { hasFeature } from "@/lib/plan-features";

const HEADERS = [
  "name",
  "slug",
  "description",
  "category",
  "price",
  "compareAtPrice",
  "costPrice",
  "sku",
  "trackInventory",
  "stockQuantity",
  "isActive",
  "isFeatured",
];

export async function GET() {
  const store = await getCurrentStore();
  if (!hasFeature(store.subscription, "CSV_EXPORT")) {
    return new Response("CSV export is available on the Growth plan and above.", { status: 403 });
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  const rows = products.map((p) => [
    p.name,
    p.slug,
    p.description ? p.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "",
    p.category?.name ?? "",
    p.price.toString(),
    p.compareAtPrice?.toString() ?? "",
    p.costPrice?.toString() ?? "",
    p.sku ?? "",
    p.trackInventory,
    p.stockQuantity,
    p.isActive,
    p.isFeatured,
  ]);

  const csv = toCsv(HEADERS, rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${store.slug}-products.csv"`,
    },
  });
}
