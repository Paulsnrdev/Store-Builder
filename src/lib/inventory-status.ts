export const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "not-tracked" | "out-of-stock" | "low-stock" | "in-stock";

export function getStockStatus(trackInventory: boolean, stockQuantity: number): StockStatus {
  if (!trackInventory) return "not-tracked";
  if (stockQuantity <= 0) return "out-of-stock";
  if (stockQuantity <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

export const stockStatusLabel: Record<StockStatus, string> = {
  "not-tracked": "Not tracked",
  "out-of-stock": "Out of stock",
  "low-stock": "Low stock",
  "in-stock": "In stock",
};

export const stockStatusClass: Record<StockStatus, string> = {
  "not-tracked": "bg-gray-100 text-gray-600",
  "out-of-stock": "bg-red-100 text-red-700",
  "low-stock": "bg-amber-100 text-amber-700",
  "in-stock": "bg-green-100 text-green-700",
};

export function isProductOutOfStock(product: {
  trackInventory: boolean;
  stockQuantity: number;
  variants: { stockQuantity: number }[];
}): boolean {
  if (product.variants.length > 0) {
    return product.variants.every((v) => v.stockQuantity <= 0);
  }
  if (!product.trackInventory) return false;
  return product.stockQuantity <= 0;
}
