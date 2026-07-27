"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  price: number;
  image: string | null;
  quantity: number;
  slug: string;
  maxQuantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function cartItemKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? ""}`;
}

function storageKey(storeSlug: string) {
  return `storebuilder:cart:${storeSlug}`;
}

export function CartProvider({ storeSlug, children }: { storeSlug: string; children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(storeSlug));
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt cart data
    }
    setLoaded(true);
  }, [storeSlug]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(storageKey(storeSlug), JSON.stringify(items));
  }, [items, storeSlug, loaded]);

  function addItem(item: Omit<CartItem, "quantity">, quantity: number) {
    const key = cartItemKey(item.productId, item.variantId);
    setItems((prev) => {
      const existing = prev.find((i) => cartItemKey(i.productId, i.variantId) === key);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, existing.maxQuantity);
        return prev.map((i) => (cartItemKey(i.productId, i.variantId) === key ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.maxQuantity) }];
    });
  }

  function updateQuantity(key: string, quantity: number) {
    setItems((prev) =>
      prev
        .map((i) => (cartItemKey(i.productId, i.variantId) === key ? { ...i, quantity: Math.min(Math.max(quantity, 1), i.maxQuantity) } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => cartItemKey(i.productId, i.variantId) !== key));
  }

  function clear() {
    setItems([]);
  }

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clear, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
