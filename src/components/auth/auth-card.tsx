import { Logo } from "@/components/marketing/logo";

const MAX_WIDTH = { sm: "max-w-sm", md: "max-w-md" } as const;

export function AuthCard({
  title,
  description,
  size = "sm",
  children,
}: {
  title: string;
  description?: string;
  size?: keyof typeof MAX_WIDTH;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-100 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-50 blur-3xl" />

      <div
        className={`relative w-full ${MAX_WIDTH[size]} animate-fade-in space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-card-hover`}
      >
        <Logo />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
