import { getCurrentStore } from "@/lib/store";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = await getCurrentStore();
  const planName = store.subscription?.plan.name ?? "Free";

  return (
    <div className="min-h-screen bg-gray-50 sm:flex print:block print:bg-white">
      <Sidebar storeName={store.name} planName={planName} />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 print:p-0">{children}</main>
    </div>
  );
}
