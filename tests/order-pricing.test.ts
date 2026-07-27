import { describe, expect, it } from "vitest";
import { priceCartItems, type PricingProduct } from "@/lib/order-pricing";

function product(overrides: Partial<PricingProduct> = {}): PricingProduct {
  return {
    id: "prod_1",
    name: "Hoodie",
    price: 25000,
    isActive: true,
    trackInventory: true,
    stockQuantity: 10,
    variants: [],
    ...overrides,
  };
}

describe("priceCartItems", () => {
  it("rejects an empty cart", () => {
    const result = priceCartItems([], new Map());
    expect(result.ok).toBe(false);
  });

  it("prices a simple item from live product data, ignoring any client-supplied price", () => {
    const products = new Map([["prod_1", product()]]);
    // The request only ever carries productId/variantId/quantity — there is no
    // price field a malicious client could tamper with in devtools.
    const result = priceCartItems([{ productId: "prod_1", variantId: null, quantity: 2 }], products);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lineItems[0].unitPrice).toBe(25000);
    expect(result.lineItems[0].total).toBe(50000);
    expect(result.subtotal).toBe(50000);
  });

  it("rejects an inactive product", () => {
    const products = new Map([["prod_1", product({ isActive: false })]]);
    const result = priceCartItems([{ productId: "prod_1", variantId: null, quantity: 1 }], products);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no longer available/);
  });

  it("rejects a product that no longer exists", () => {
    const result = priceCartItems([{ productId: "missing", variantId: null, quantity: 1 }], new Map());
    expect(result.ok).toBe(false);
  });

  it("rejects quantity beyond available stock", () => {
    const products = new Map([["prod_1", product({ stockQuantity: 3 })]]);
    const result = priceCartItems([{ productId: "prod_1", variantId: null, quantity: 5 }], products);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Only 3/);
  });

  it("allows unlimited quantity when trackInventory is off", () => {
    const products = new Map([["prod_1", product({ trackInventory: false, stockQuantity: 0 })]]);
    const result = priceCartItems([{ productId: "prod_1", variantId: null, quantity: 500 }], products);
    expect(result.ok).toBe(true);
  });

  it("prices variants using the variant's own price, not the base product price", () => {
    const products = new Map([
      [
        "prod_1",
        product({
          price: 25000,
          variants: [{ id: "var_1", name: "L / Black", price: 27000, stockQuantity: 4 }],
        }),
      ],
    ]);
    const result = priceCartItems([{ productId: "prod_1", variantId: "var_1", quantity: 1 }], products);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lineItems[0].unitPrice).toBe(27000);
    expect(result.lineItems[0].variantName).toBe("L / Black");
  });

  it("falls back to the base product price when a variant has no price override", () => {
    const products = new Map([
      [
        "prod_1",
        product({
          price: 25000,
          variants: [{ id: "var_1", name: "L / Black", price: null, stockQuantity: 4 }],
        }),
      ],
    ]);
    const result = priceCartItems([{ productId: "prod_1", variantId: "var_1", quantity: 1 }], products);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lineItems[0].unitPrice).toBe(25000);
  });

  it("rejects a variant that no longer exists on the product", () => {
    const products = new Map([["prod_1", product({ variants: [{ id: "var_1", name: "L", price: null, stockQuantity: 4 }] })]]);
    const result = priceCartItems([{ productId: "prod_1", variantId: "var_missing", quantity: 1 }], products);
    expect(result.ok).toBe(false);
  });

  it("checks stock against the specific variant, not the product total", () => {
    const products = new Map([
      [
        "prod_1",
        product({
          stockQuantity: 999,
          variants: [{ id: "var_1", name: "S", price: null, stockQuantity: 1 }],
        }),
      ],
    ]);
    const result = priceCartItems([{ productId: "prod_1", variantId: "var_1", quantity: 2 }], products);
    expect(result.ok).toBe(false);
  });

  it("sums multiple line items into the subtotal", () => {
    const products = new Map([
      ["prod_1", product({ id: "prod_1", price: 10000 })],
      ["prod_2", product({ id: "prod_2", price: 5000, name: "Tee" })],
    ]);
    const result = priceCartItems(
      [
        { productId: "prod_1", variantId: null, quantity: 2 },
        { productId: "prod_2", variantId: null, quantity: 3 },
      ],
      products
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subtotal).toBe(2 * 10000 + 3 * 5000);
  });
});
