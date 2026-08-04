import { cn } from "@/lib/cn";

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-4 shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}
