import { cn } from "@/lib/cn";

export function StatusBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2 py-1 text-xs font-medium", tone)}>{children}</span>;
}
