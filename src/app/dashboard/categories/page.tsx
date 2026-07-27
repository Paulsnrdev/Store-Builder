import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { deleteCategory } from "@/lib/actions/categories";
import { DeleteButton } from "@/components/dashboard/delete-button";

export default async function CategoriesPage() {
  const store = await getCurrentStore();
  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
        <Link
          href="/dashboard/categories/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New category
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Sort order</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
