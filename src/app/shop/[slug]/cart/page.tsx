"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart, cartItemKey } from "@/components/storefront/cart-context";
import { CartSyncControl } from "@/components/storefront/cart-sync-control";

export default function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-500">Your cart is empty.</p>
        <div className="mx-auto mt-6 max-w-sm text-left">
          <CartSyncControl />
        </div>
        <Link href={`/shop/${slug}`} className="mt-2 inline-block text-sm font-medium text-gray-900 underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Your cart</h1>

      <CartSyncControl />

      <div className="divide-y divide-gray-100 border-y border-gray-100">
        {items.map((item) => {
          const key = cartItemKey(item.productId, item.variantId);
          return (
            <div key={key} className="flex items-center gap-3 py-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
              </div>
              <div className="flex-1">
                <Link href={`/shop/${slug}/product/${item.slug}`} className="text-sm font-medium text-gray-900">
                  {item.name}
                </Link>
                {item.variantName && <p className="text-xs text-gray-400">{item.variantName}</p>}
                <p className="mt-1 text-sm text-gray-600">₦{item.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center rounded-md border border-gray-300">
                <button
                  type="button"
                  onClick={() => updateQuantity(key, item.quantity - 1)}
                  className="px-2.5 py-1 text-gray-500"
                >
                  −
                </button>
                <span className="px-2.5 py-1 text-sm">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(key, item.quantity + 1)}
                  disabled={item.quantity >= item.maxQuantity}
                  className="px-2.5 py-1 text-gray-500 disabled:opacity-30"
                >
                  +
                </button>
              </div>
              <button type="button" onClick={() => removeItem(key)} className="text-xs text-red-600">
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between text-base font-semibold text-gray-900">
        <span>Subtotal</span>
        <span>₦{subtotal.toLocaleString()}</span>
      </div>

      <Link
        href={`/shop/${slug}/checkout`}
        className="mt-4 block w-full rounded-md bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white"
      >
        Checkout
      </Link>
      <Link href={`/shop/${slug}`} className="mt-3 block text-center text-sm text-gray-500 underline">
        Continue shopping
      </Link>
    </div>
  );
}
