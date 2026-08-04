"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Overview", ownerOnly: false },
  { href: "/dashboard/analytics", label: "Analytics", ownerOnly: false },
  { href: "/dashboard/products", label: "Products", ownerOnly: false },
  { href: "/dashboard/categories", label: "Categories", ownerOnly: false },
  { href: "/dashboard/orders", label: "Orders", ownerOnly: false },
  { href: "/dashboard/customers", label: "Customers", ownerOnly: false },
  { href: "/dashboard/shipping", label: "Shipping", ownerOnly: false },
  { href: "/dashboard/discounts", label: "Discounts", ownerOnly: false },
  { href: "/dashboard/team", label: "Team", ownerOnly: true },
  { href: "/dashboard/billing", label: "Billing", ownerOnly: true },
  { href: "/dashboard/settings", label: "Settings", ownerOnly: false },
];

function NavLinks({ pathname, isOwner, onNavigate }: { pathname: string; isOwner: boolean; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {links.filter((link) => isOwner || !link.ownerOnly).map((link) => {
        const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PlanBadge({ planName, isOwner }: { planName: string; isOwner: boolean }) {
  const className = "inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700";
  if (!isOwner) return <span className={className}>{planName} plan</span>;
  return (
    <Link href="/dashboard/billing" className={`${className} transition-colors hover:bg-brand-100`}>
      {planName} plan
    </Link>
  );
}

export function Sidebar({ storeName, planName, isOwner }: { storeName: string; planName: string; isOwner: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop/tablet sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white sm:flex sm:flex-col sm:justify-between sm:p-4 print:hidden">
        <div>
          <div className="mb-1 px-2 text-lg font-semibold text-gray-900">{storeName}</div>
          <div className="mb-6 px-2">
            <PlanBadge planName={planName} isOwner={isOwner} />
          </div>
          <NavLinks pathname={pathname} isOwner={isOwner} />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100"
        >
          Sign out
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:hidden print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-md text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold text-gray-900">{storeName}</span>
        </div>
        <div className="ml-auto">
          <PlanBadge planName={planName} isOwner={isOwner} />
        </div>
      </div>

      {/* Mobile off-canvas drawer */}
      <div
        className={`fixed inset-0 z-30 sm:hidden print:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="text-lg font-semibold text-gray-900">{storeName}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-md text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <NavLinks pathname={pathname} isOwner={isOwner} onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t border-gray-100 p-4">
            <button
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/login" });
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
