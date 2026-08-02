"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/storefront/cart-context";

type NavCategory = { id: string; name: string; slug: string };

export function StorefrontHeader({
  storeSlug,
  storeName,
  logoUrl,
  categories,
}: {
  storeSlug: string;
  storeName: string;
  logoUrl: string | null;
  categories: NavCategory[];
}) {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          {categories.length > 0 && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="-ml-2 flex h-9 w-9 items-center justify-center rounded-md text-gray-700 sm:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                )}
              </svg>
            </button>
          )}
          <Link href={`/shop/${storeSlug}`} className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            {logoUrl ? (
              <Image src={logoUrl} alt={storeName} width={32} height={32} className="rounded-full object-cover" />
            ) : null}
            <span className="text-lg font-semibold text-gray-900">{storeName}</span>
          </Link>
        </div>

        {categories.length > 0 && (
          <nav className="hidden items-center gap-5 text-sm font-medium text-gray-700 sm:flex">
            <Link href={`/shop/${storeSlug}`} className="hover:text-gray-950">
              Home
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/shop/${storeSlug}/category/${c.slug}`} className="hover:text-gray-950">
                {c.name}
              </Link>
            ))}
          </nav>
        )}

        <Link href={`/shop/${storeSlug}/cart`} className="relative flex items-center gap-1 text-sm font-medium text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.87-4.694 2.25-7.5H5.106M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          {itemCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white">
              {itemCount}
            </span>
          )}
        </Link>
      </div>

      {menuOpen && categories.length > 0 && (
        <nav className="border-t border-gray-200 bg-white px-4 py-3 sm:hidden">
          <ul className="space-y-1">
            <li>
              <Link
                href={`/shop/${storeSlug}`}
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Home
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/shop/${storeSlug}/category/${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
