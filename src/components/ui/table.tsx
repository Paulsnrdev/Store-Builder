import { cn } from "@/lib/cn";

export function TableShell({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-gray-200 bg-white", className)} {...rest}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-brand-50/60 text-left text-xs font-medium uppercase tracking-wide text-brand-800">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-100 [&>tr]:transition-colors [&>tr:hover]:bg-gray-50">{children}</tbody>;
}

export function TableEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400">
        {children}
      </td>
    </tr>
  );
}
