"use client";

export function FilterSelect({
  name,
  defaultValue,
  className,
  children,
}: {
  name: string;
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={className ?? "rounded-md border border-gray-300 px-3 py-2 text-sm"}
    >
      {children}
    </select>
  );
}
