export function RevenueChart({ data }: { data: { label: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="flex h-32 gap-0.5">
      {data.map((d, i) => (
        <div key={i} className="group relative flex flex-1 items-end">
          <div
            className="w-full rounded-t-sm bg-brand-600 transition-[height] duration-500 ease-out"
            style={{ height: `${Math.max((d.amount / max) * 100, d.amount > 0 ? 4 : 1)}%` }}
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {d.label}: ₦{d.amount.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
