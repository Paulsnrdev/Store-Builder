"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "@/lib/actions/admin-auth";

const links = [
  { href: "/dist", label: "Overview" },
  { href: "/dist/businesses", label: "Businesses" },
  { href: "/dist/plans", label: "Plans" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6 px-2 text-lg font-semibold text-gray-900">Admin</div>
      <nav className="space-y-1">
        {links.map((link) => {
          const active = link.href === "/dist" ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <form action={adminLogout}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Sign out
          </button>
        </form>
      </nav>
    </div>
  );
}
