export type CartItemRequest = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

export type PricingVariant = {
  id: string;
  name: string;
  price: number | null;
  stockQuantity: number;
};

export type PricingProduct = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  trackInventory: boolean;
  stockQuantity: number;
  variants: PricingVariant[];
};

export type PricedLineItem = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type PriceCartResult = { ok: true; lineItems: PricedLineItem[]; subtotal: number } | { ok: false; error: string };

/**
 * Re-prices and re-validates a cart against live product data. Never trusts
 * client-supplied names/prices — only productId/variantId/quantity are used
 * from the request, everything else is looked up fresh.
 */
export function priceCartItems(requests: CartItemRequest[], products: Map<string, PricingProduct>): PriceCartResult {
  if (requests.length === 0) return { ok: false, error: "Cart is empty." };

  const lineItems: PricedLineItem[] = [];

  for (const req of requests) {
    if (req.quantity <= 0) return { ok: false, error: "Invalid quantity." };

    const product = products.get(req.productId);
    if (!product || !product.isActive) {
      return { ok: false, error: `${product?.name ?? "An item"} in your cart is no longer available.` };
    }

    let unitPrice: number;
    let availableStock: number;
    let variantName: string | null = null;

    if (req.variantId) {
      const variant = product.variants.find((v) => v.id === req.variantId);
      if (!variant) return { ok: false, error: `${product.name} option is no longer available.` };
      unitPrice = variant.price ?? product.price;
      availableStock = variant.stockQuantity;
      variantName = variant.name;
    } else {
      unitPrice = product.price;
      availableStock = product.trackInventory ? product.stockQuantity : Number.POSITIVE_INFINITY;
    }

    if (req.quantity > availableStock) {
      return {
        ok: false,
        error: availableStock <= 0 ? `${product.name} is out of stock.` : `Only ${availableStock} of ${product.name} left in stock.`,
      };
    }

    lineItems.push({
      productId: product.id,
      variantId: req.variantId,
      productName: product.name,
      variantName,
      quantity: req.quantity,
      unitPrice,
      total: unitPrice * req.quantity,
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  return { ok: true, lineItems, subtotal };
}
