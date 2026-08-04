export const STORE_NICHES = [
  { value: "FASHION_APPAREL", slug: "fashion-apparel", label: "Fashion & Apparel" },
  { value: "BEAUTY_SKINCARE", slug: "beauty-skincare", label: "Beauty & Skincare" },
  { value: "ELECTRONICS_GADGETS", slug: "electronics-gadgets", label: "Electronics & Gadgets" },
  { value: "FOOD_GROCERIES", slug: "food-groceries", label: "Food & Groceries" },
  { value: "HOME_LIVING", slug: "home-living", label: "Home & Living" },
  { value: "KIDS_BABY", slug: "kids-baby", label: "Kids & Baby" },
  { value: "HEALTH_WELLNESS", slug: "health-wellness", label: "Health & Wellness" },
  { value: "BOOKS_STATIONERY", slug: "books-stationery", label: "Books & Stationery" },
  { value: "ARTS_CRAFTS", slug: "arts-crafts", label: "Arts & Crafts" },
  { value: "OTHER", slug: "other", label: "Other" },
] as const;

export const NICHE_VALUES = STORE_NICHES.map((n) => n.value) as [(typeof STORE_NICHES)[number]["value"], ...(typeof STORE_NICHES)[number]["value"][]];

export const nicheLabel: Record<string, string> = Object.fromEntries(STORE_NICHES.map((n) => [n.value, n.label]));

export function nicheBySlug(slug: string) {
  return STORE_NICHES.find((n) => n.slug === slug);
}

export function nicheSlug(value: string): string {
  return STORE_NICHES.find((n) => n.value === value)?.slug ?? "other";
}
