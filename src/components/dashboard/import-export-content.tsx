"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importProductsCsv, type ImportResult } from "@/lib/actions/products-import";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ImportExportContent({ canExportCsv }: { canExportCsv: boolean }) {
  const [result, formAction, pending] = useActionState<ImportResult | null, FormData>(importProductsCsv, null);

  return (
    <div className="max-w-xl">
      <Link href="/dashboard/products" className="text-sm text-gray-500 hover:underline">
        ← Back to products
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Import / Export</h1>

      <Card className="mt-6 p-6">
        <h2 className="font-medium text-gray-900">Export</h2>
        <p className="mt-1 text-sm text-gray-500">Download all your products as a CSV file.</p>
        {canExportCsv ? (
          <Button href="/api/dashboard/products/export" variant="secondary" className="mt-3">
            Download CSV
          </Button>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            CSV export is available on the Growth plan and above.{" "}
            <Link href="/dashboard/billing" className="font-medium text-brand-600 hover:underline">
              Upgrade
            </Link>
          </p>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-medium text-gray-900">Import</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV with columns: name, slug, description, category, price, compareAtPrice, costPrice, sku,
          trackInventory, stockQuantity, isActive, isFeatured. Matching products (by slug) are updated; others are
          created.
        </p>
        <form action={formAction} className="mt-3 space-y-3">
          <input type="file" name="file" accept=".csv" required className="text-sm" />
          <Button type="submit" disabled={pending}>
            {pending ? "Importing..." : "Import"}
          </Button>
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
      </Card>
    </div>
  );
}
