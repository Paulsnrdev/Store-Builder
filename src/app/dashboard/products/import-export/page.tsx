"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importProductsCsv, type ImportResult } from "@/lib/actions/products-import";

export default function ImportExportPage() {
  const [result, formAction, pending] = useActionState<ImportResult | null, FormData>(importProductsCsv, null);

  return (
    <div className="max-w-xl">
      <Link href="/dashboard/products" className="text-sm text-gray-500 hover:underline">
        ← Back to products
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Import / Export</h1>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-medium text-gray-900">Export</h2>
        <p className="mt-1 text-sm text-gray-500">Download all your products as a CSV file.</p>
        <a
          href="/api/dashboard/products/export"
          className="mt-3 inline-block rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Download CSV
        </a>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-medium text-gray-900">Import</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV with columns: name, slug, description, category, price, compareAtPrice, costPrice, sku,
          trackInventory, stockQuantity, isActive, isFeatured. Matching products (by slug) are updated; others are
          created.
        </p>
        <form action={formAction} className="mt-3 space-y-3">
          <input type="file" name="file" accept=".csv" required className="text-sm" />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? "Importing..." : "Import"}
          </button>
        </form>

        {result && (
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm">
            <p>
              Created {result.created}, updated {result.updated}.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-red-600">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
