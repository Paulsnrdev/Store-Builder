"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/storefront/cart-context";

export type VariantData = {
  id: string;
  name: string;
  options: Record<string, string>;
  price: number | null;
  stockQuantity: number;
};

export function ProductOptions({
  storeSlug,
  productId,
  slug,
  name,
  basePrice,
  image,
  trackInventory,
  stockQuantity,
  variants,
}: {
  storeSlug: string;
  productId: string;
  slug: string;
  name: string;
  basePrice: number;
  image: string | null;
  trackInventory: boolean;
  stockQuantity: number;
  variants: VariantData[];
}) {
  const { addItem } = useCart();
  const router = useRouter();

  const optionGroups = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    for (const v of variants) {
      for (const [key, value] of Object.entries(v.options)) {
        if (!groups.has(key)) groups.set(key, new Set());
        groups.get(key)!.add(value);
      }
    }
    return Array.from(groups.entries()).map(([key, values]) => ({ key, values: Array.from(values) }));
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const hasVariants = variants.length > 0;
  const allSelected = optionGroups.every((g) => selected[g.key]);
  const matchedVariant = hasVariants
    ? variants.find((v) => optionGroups.every((g) => v.options[g.key] === selected[g.key]))
    : null;

  const price = matchedVariant?.price ?? basePrice;
  const maxQuantity = hasVariants
    ? (matchedVariant?.stockQuantity ?? 0)
    : trackInventory
      ? stockQuantity
      : 99;
  const canAddToCart = hasVariants ? allSelected && maxQuantity > 0 : maxQuantity > 0;

  function handleAddToCart() {
    if (!canAddToCart) return;
    addItem(
      {
        productId,
        variantId: matchedVariant?.id ?? null,
        name,
        variantName: matchedVariant?.name ?? null,
        price,
        image,
        slug,
        maxQuantity,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div>
      <div className="text-2xl font-semibold text-gray-900">₦{price.toLocaleString()}</div>

      {optionGroups.map((group) => (
        <div key={group.key} className="mt-4">
          <label className="block text-sm font-medium capitalize text-gray-700">{group.key}</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {group.values.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelected((prev) => ({ ...prev, [group.key]: value }))}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  selected[group.key] === value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Qty</label>
        <div className="flex items-center rounded-md border border-gray-300">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-1.5 text-gray-500"
          >
            −
          </button>
          <span className="px-3 py-1.5 text-sm">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity || 1, q + 1))}
            className="px-3 py-1.5 text-gray-500"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!canAddToCart}
        className="mt-4 w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {!hasVariants && maxQuantity <= 0
          ? "Out of stock"
          : hasVariants && !allSelected
            ? "Select options"
            : hasVariants && maxQuantity <= 0
              ? "Out of stock"
              : added
                ? "Added ✓"
                : "Add to cart"}
      </button>

      {added && (
        <button
          type="button"
          onClick={() => router.push(`/shop/${storeSlug}/cart`)}
          className="mt-2 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
        >
          View cart
        </button>
      )}
    </div>
  );
}
