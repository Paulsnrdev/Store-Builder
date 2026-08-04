import { getPublishedStore } from "@/lib/storefront";
import { hasFeature } from "@/lib/plan-features";
import { CartPageContent } from "@/components/storefront/cart-page-content";

export default async function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getPublishedStore(slug);

  return <CartPageContent slug={slug} showCartSync={hasFeature(store.subscription, "CART_SYNC")} />;
}
