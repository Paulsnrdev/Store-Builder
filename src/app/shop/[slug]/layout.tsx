import { getPublishedStore } from "@/lib/storefront";
import { CartProvider } from "@/components/storefront/cart-context";
import { StorefrontHeader } from "@/components/storefront/header";
import { AnnouncementBar } from "@/components/storefront/announcement-bar";
import { SocialLinks } from "@/components/storefront/social-links";
import { parseTheme, parseSocialLinks, FONT_FAMILY } from "@/lib/theme";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getPublishedStore(slug);
  const theme = parseTheme(store.theme);
  const socialLinks = parseSocialLinks(store.socialLinks);

  return (
    <CartProvider storeId={store.id} storeSlug={store.slug}>
      <div
        className="flex min-h-screen flex-col bg-white"
        style={{ "--store-primary": theme.color, fontFamily: FONT_FAMILY[theme.font] } as React.CSSProperties}
      >
        {store.announcementEnabled && store.announcementText && <AnnouncementBar text={store.announcementText} />}
        <StorefrontHeader storeSlug={store.slug} storeName={store.name} logoUrl={store.logoUrl} />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
          {store.name} · Powered by Store Builder
          <SocialLinks links={socialLinks} />
        </footer>
      </div>
    </CartProvider>
  );
}
