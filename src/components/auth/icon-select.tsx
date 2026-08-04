import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export function IconSelect({
  icon: Icon,
  className,
  children,
  ...props
}: { icon: LucideIcon } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Select className={cn("appearance-none pl-9 pr-9", className)} {...props}>
        {children}
      </Select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
