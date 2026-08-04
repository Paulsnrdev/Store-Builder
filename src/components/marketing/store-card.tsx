import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type Store = {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  _count: { products: number };
};

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link href={`/shop/${store.slug}`}>
      <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-card-hover">
        <div className="flex items-center gap-3">
          {store.logoUrl ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
              <Image src={store.logoUrl} alt="" fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700">
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">{store.name}</h3>
            <p className="text-xs text-gray-500">{store._count.products} products</p>
          </div>
        </div>
        {store.description && <p className="mt-3 line-clamp-2 text-sm text-gray-600">{store.description}</p>}
        <span className="mt-4 text-sm font-medium text-brand-600">Visit store →</span>
      </Card>
    </Link>
  );
}
