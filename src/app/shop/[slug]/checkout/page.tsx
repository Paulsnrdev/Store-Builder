import { getPublishedStore } from "@/lib/storefront";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { hasFeature } from "@/lib/plan-features";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getPublishedStore(slug);

  const zones = await prisma.shippingZone.findMany({ where: { storeId: store.id } });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">Checkout</h1>
      <CheckoutForm
        storeId={store.id}
        storeSlug={store.slug}
        storeName={store.name}
        allowCardPayments={hasFeature(store.subscription, "CARD_PAYMENTS")}
        flutterwavePublicKey={store.flutterwavePublicKey}
        zones={zones.map((z) => ({
          id: z.id,
          name: z.name,
          states: z.states,
          rate: Number(z.rate),
          freeAbove: z.freeAbove ? Number(z.freeAbove) : null,
        }))}
      />
    </div>
  );
}
