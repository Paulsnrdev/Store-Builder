import type { SocialLinks as SocialLinksType } from "@/lib/theme";

const PLATFORM_LABEL: Record<keyof SocialLinksType, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X",
  tiktok: "TikTok",
};

export function SocialLinks({ links }: { links: SocialLinksType }) {
  const entries = (Object.keys(PLATFORM_LABEL) as (keyof SocialLinksType)[]).filter((key) => links[key]);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 flex justify-center gap-4">
      {entries.map((key) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          {PLATFORM_LABEL[key]}
        </a>
      ))}
    </div>
  );
}
