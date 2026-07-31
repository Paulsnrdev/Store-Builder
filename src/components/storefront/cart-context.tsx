"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { pullCart, pushCart } from "@/lib/actions/cart-sync";

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
  /** Phone number this device's cart is linked to for cross-device sync, if any. */
  linkedPhone: string | null;
  /** Pulls the cart saved under this phone number (if any) and links this device to it for future syncing. */
  linkPhone: (phone: string) => Promise<{ restored: boolean }>;
  unlinkPhone: () => void;
  syncing: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function cartItemKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? ""}`;
}

function cartStorageKey(storeSlug: string) {
  return `storehike:cart:${storeSlug}`;
}

function phoneStorageKey(storeSlug: string) {
  return `storehike:cart-phone:${storeSlug}`;
}

export function CartProvider({
  storeId,
  storeSlug,
  children,
}: {
  storeId: string;
  storeSlug: string;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(cartStorageKey(storeSlug));
      if (raw) setItems(JSON.parse(raw));
      setLinkedPhone(localStorage.getItem(phoneStorageKey(storeSlug)));
    } catch {
      // ignore corrupt cart data
    }
    setLoaded(true);
  }, [storeSlug]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(cartStorageKey(storeSlug), JSON.stringify(items));

    if (!linkedPhone) return;
    // Debounce pushes so rapid quantity clicks don't fire a request per click.
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      setSyncing(true);
      await pushCart(storeId, linkedPhone, items).catch(() => {});
      setSyncing(false);
    }, 1000);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [items, storeSlug, storeId, linkedPhone, loaded]);

  async function linkPhone(phone: string): Promise<{ restored: boolean }> {
    const trimmed = phone.trim();
    if (!trimmed) return { restored: false };

    setSyncing(true);
    const synced = await pullCart(storeId, trimmed).finally(() => setSyncing(false));

    localStorage.setItem(phoneStorageKey(storeSlug), trimmed);
    setLinkedPhone(trimmed);

    if (synced && synced.items.length > 0) {
      setItems(synced.items);
      return { restored: true };
    }

    // Nothing saved under this number yet — treat this device's cart as the starting point.
    await pushCart(storeId, trimmed, items).catch(() => {});
    return { restored: false };
  }

  function unlinkPhone() {
    localStorage.removeItem(phoneStorageKey(storeSlug));
    setLinkedPhone(null);
  }

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
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clear, subtotal, itemCount, linkedPhone, linkPhone, unlinkPhone, syncing }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
