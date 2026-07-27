export type StoreTheme = { color: string; font: "sans" | "serif" };
export type SocialLinks = { instagram?: string; facebook?: string; twitter?: string; tiktok?: string };

const DEFAULT_COLOR = "#111827";

export function parseTheme(theme: unknown): StoreTheme {
  const t = (theme ?? {}) as { color?: string; font?: string };
  return { color: t.color || DEFAULT_COLOR, font: t.font === "serif" ? "serif" : "sans" };
}

export function parseSocialLinks(socialLinks: unknown): SocialLinks {
  return (socialLinks ?? {}) as SocialLinks;
}

export const FONT_FAMILY: Record<StoreTheme["font"], string | undefined> = {
  sans: undefined,
  serif: "Georgia, 'Times New Roman', serif",
};
