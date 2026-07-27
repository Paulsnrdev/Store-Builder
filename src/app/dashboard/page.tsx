import { getCurrentStore } from "@/lib/store";

export default async function DashboardHomePage() {
  const store = await getCurrentStore();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
      <p className="mt-1 text-sm text-gray-500">{store.name}</p>
    </div>
  );
}
