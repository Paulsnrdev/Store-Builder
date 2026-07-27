"use client";

import { useActionState, useState } from "react";
import { RichTextEditor } from "@/components/dashboard/rich-text-editor";
import { MultiImageUploader, type ProductImageItem } from "@/components/dashboard/image-uploader";
import { VariantEditor, type Variant } from "@/components/dashboard/variant-editor";
import type { ProductFormState } from "@/lib/actions/products";

type Action = (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;

export type ProductInitial = {
  name: string;
  categoryId: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  sku: string | null;
  trackInventory: boolean;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  weight: number | null;
  images: ProductImageItem[];
  variants: Variant[];
};

export function ProductForm({
  action,
  categories,
  initial,
}: {
  action: Action;
  categories: { id: string; name: string }[];
  initial?: ProductInitial;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [images, setImages] = useState<ProductImageItem[]>(initial?.images ?? []);
  const [variants, setVariants] = useState<Variant[]>(initial?.variants ?? []);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [trackInventory, setTrackInventory] = useState(initial?.trackInventory ?? true);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={initial?.name}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <div className="mt-1">
          <RichTextEditor name="description" defaultValue={initial?.description} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          name="categoryId"
          defaultValue={initial?.categoryId ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Price (₦)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Compare-at price</label>
          <input
            name="compareAtPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.compareAtPrice ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Cost price</label>
          <input
            name="costPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.costPrice ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">SKU</label>
          <input
            name="sku"
            type="text"
            defaultValue={initial?.sku ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
          <input
            name="weight"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.weight ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <MultiImageUploader images={images} onChange={setImages} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="trackInventory"
            defaultChecked={initial?.trackInventory ?? true}
            onChange={(e) => setTrackInventory(e.target.checked)}
          />
          Track inventory
        </label>
        {trackInventory && (
          <div>
            <input
              name="stockQuantity"
              type="number"
              min="0"
              defaultValue={initial?.stockQuantity ?? 0}
              className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} />
          Active (visible in store)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="isFeatured" defaultChecked={initial?.isFeatured ?? false} />
          Featured
        </label>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700">Variants</h3>
        <p className="mb-2 text-xs text-gray-400">
          Optional. Define options like Size and Colour to sell this product in multiple combinations.
        </p>
        <VariantEditor initialVariants={variants} basePrice={price} onChange={setVariants} />
      </div>
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save product"}
      </button>
    </form>
  );
}
