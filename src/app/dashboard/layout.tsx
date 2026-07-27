import { getCurrentStore } from "@/lib/store";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = await getCurrentStore();

  return (
    <div className="flex min-h-screen bg-gray-50 print:block print:bg-white">
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white print:hidden">
        <Sidebar storeName={store.name} />
      </aside>
      <main className="flex-1 overflow-x-hidden p-6 print:p-0">{children}</main>
    </div>
  );
}
