import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { deleteCategory } from "@/lib/actions/categories";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TableShell, TableHead, TableBody, TableEmpty } from "@/components/ui/table";

export default async function CategoriesPage() {
  const store = await getCurrentStore();
  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <PageHeader title="Categories" action={<Button href="/dashboard/categories/new">New category</Button>} />

      <TableShell className="mt-6">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Sort order</th>
              <th className="px-4 py-3" />
            </tr>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3">
                  {category.imageUrl ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-md">
                      <Image src={category.imageUrl} alt="" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-gray-100" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                <td className="px-4 py-3 text-gray-500">{category._count.products}</td>
                <td className="px-4 py-3 text-gray-500">{category.sortOrder}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link href={`/dashboard/categories/${category.id}`} className="font-medium text-gray-600 hover:underline">
                      Edit
                    </Link>
                    <DeleteButton action={deleteCategory.bind(null, category.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && <TableEmpty colSpan={5}>No categories yet.</TableEmpty>}
          </TableBody>
        </table>
      </TableShell>
    </div>
  );
}
