"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { bulkDeleteProducts, bulkSetActive, deleteProduct, duplicateProduct } from "@/lib/actions/products";
import { getStockStatus, stockStatusClass, stockStatusLabel } from "@/lib/inventory-status";
import { TableShell, TableHead, TableBody, TableEmpty } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  price: string;
  isActive: boolean;
  trackInventory: boolean;
  stockQuantity: number;
  categoryName: string | null;
  imageUrl: string | null;
};

export function ProductsTable({ products }: { products: ProductRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === products.length ? new Set() : new Set(products.map((p) => p.id))));
  }

  const selectedIds = Array.from(selected);

  return (
    <div>
      {selectedIds.length > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
          <span className="font-medium text-gray-700">{selectedIds.length} selected</span>
          <button
            disabled={isPending}
            onClick={() => startTransition(async () => { await bulkSetActive(selectedIds, true); setSelected(new Set()); })}
            className="text-gray-700 hover:underline"
          >
            Activate
          </button>
          <button
            disabled={isPending}
            onClick={() => startTransition(async () => { await bulkSetActive(selectedIds, false); setSelected(new Set()); })}
            className="text-gray-700 hover:underline"
          >
            Deactivate
          </button>
          <button
            disabled={isPending}
            onClick={() => {
              if (!confirm(`Delete ${selectedIds.length} product(s)? This cannot be undone.`)) return;
              startTransition(async () => { await bulkDeleteProducts(selectedIds); setSelected(new Set()); });
            }}
            className="text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      )}

      <TableShell>
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size > 0 && selected.size === products.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </TableHead>
          <TableBody>
            {products.map((product) => {
              const status = getStockStatus(product.trackInventory, product.stockQuantity);
              return (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggle(product.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {product.imageUrl && <Image src={product.imageUrl} alt="" fill className="object-cover" />}
                      </div>
                      <div>
                        <Link href={`/dashboard/products/${product.id}`} className="font-medium text-gray-900 hover:underline">
                          {product.name}
                        </Link>
                        {product.sku && <div className="text-xs text-gray-400">{product.sku}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{product.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">₦{Number(product.price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {product.trackInventory ? product.stockQuantity : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={stockStatusClass[status]}>{stockStatusLabel[status]}</StatusBadge>
                    {!product.isActive && (
                      <StatusBadge tone="ml-1 bg-gray-100 text-gray-500">Draft</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/dashboard/products/${product.id}`} className="font-medium text-gray-600 hover:underline">
                        Edit
                      </Link>
                      <button
                        onClick={() => startTransition(() => duplicateProduct(product.id))}
                        className="font-medium text-gray-600 hover:underline"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm("Delete this product?")) return;
                          startTransition(() => deleteProduct(product.id));
                        }}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && <TableEmpty colSpan={7}>No products found.</TableEmpty>}
          </TableBody>
        </table>
      </TableShell>
    </div>
  );
}
