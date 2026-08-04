import { getCurrentStore } from "@/lib/store";
import { hasFeature } from "@/lib/plan-features";
import { ImportExportContent } from "@/components/dashboard/import-export-content";

export default async function ImportExportPage() {
  const store = await getCurrentStore();
  return <ImportExportContent canExportCsv={hasFeature(store.subscription, "CSV_EXPORT")} />;
}
