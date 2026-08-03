import Link from "next/link";

export function StaticPageLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-gray-900">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" />
                <path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" />
                <path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" />
              </svg>
            </span>
            <span className="text-lg font-semibold text-gray-900">StoreHike</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <div className="prose prose-sm mt-8 max-w-none space-y-4 text-gray-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_a]:text-gray-900 [&_a]:underline">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-100 px-4 py-8 text-center text-xs text-gray-400">
        StoreHike — hosted storefronts for Instagram &amp; WhatsApp sellers.
      </footer>
    </div>
  );
}
