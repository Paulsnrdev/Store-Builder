import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "md" | "sm";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:opacity-50 disabled:pointer-events-none",
  secondary:
    "border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none",
  danger:
    "border border-gray-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:pointer-events-none",
  ghost: "text-gray-500 hover:underline",
};

const SIZE_CLASS: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { md: "rounded-md px-4 py-2 text-sm font-medium", sm: "rounded-md px-3 py-1.5 text-sm font-medium" },
  secondary: { md: "rounded-md px-4 py-2 text-sm font-medium", sm: "rounded-md px-3 py-1.5 text-sm font-medium" },
  danger: { md: "rounded-md px-4 py-2 text-sm font-medium", sm: "rounded-md px-3 py-1.5 text-sm font-medium" },
  ghost: { md: "text-sm font-medium", sm: "text-sm font-medium" },
};

const BASE = "inline-flex items-center justify-center gap-2 transition-colors duration-150 focus-visible:outline-none";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: React.ReactNode;
};

type ButtonAsButton = CommonProps & { href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;
type ButtonAsLink = CommonProps & { href: string } & Omit<React.ComponentProps<typeof Link>, "className" | "href">;

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonAsButton | ButtonAsLink) {
  const classes = cn(BASE, VARIANT_CLASS[variant], SIZE_CLASS[variant][size], className);

  if (props.href !== undefined) {
    const { href, children, ...linkProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { children, ...buttonProps } = props as ButtonAsButton;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
