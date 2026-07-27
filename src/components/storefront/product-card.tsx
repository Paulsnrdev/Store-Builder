import Link from "next/link";
import Image from "next/image";

export type ProductCardData = {
  slug: string;
  name: string;
  price: string;
  compareAtPrice: string | null;
  imageUrl: string | null;
  outOfStock: boolean;
};

export function ProductCard({ storeSlug, product }: { storeSlug: string; product: ProductCardData }) {
  return (
    <Link href={`/shop/${storeSlug}/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-opacity group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-300">No image</div>
        )}
        {product.outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-600">
            Out of stock
          </span>
        )}
      </div>
      <div className="mt-2">
        <h3 className="line-clamp-1 text-sm font-medium text-gray-900">{product.name}</h3>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">₦{Number(product.price).toLocaleString()}</span>
          {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
            <span className="text-xs text-gray-400 line-through">₦{Number(product.compareAtPrice).toLocaleString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
