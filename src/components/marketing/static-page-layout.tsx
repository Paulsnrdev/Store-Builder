import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

export function StaticPageLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/marketplace" className="text-gray-600 hover:text-gray-900">
              Marketplace
            </Link>
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Back home
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 animate-fade-in px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <div className="prose prose-sm mt-8 max-w-none space-y-4 text-gray-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_a]:text-brand-600 [&_a]:underline">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-100 px-4 py-8 text-center text-xs text-gray-400">
        StoreHike — hosted storefronts for Instagram &amp; WhatsApp sellers.
      </footer>
    </div>
  );
}
