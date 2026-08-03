import { cn } from "@/lib/cn";
import { fieldBase } from "@/components/ui/input";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, className)} {...props} />;
}
