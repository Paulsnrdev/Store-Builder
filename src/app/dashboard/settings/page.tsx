import { getCurrentStore } from "@/lib/store";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const store = await getCurrentStore();

  const theme = (store.theme ?? {}) as { color?: string; font?: string };
  const socialLinks = (store.socialLinks ?? {}) as {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <div className="mt-6">
        <SettingsForm
          initial={{
            name: store.name,
            phone: store.phone,
            whatsappNumber: store.whatsappNumber,
            email: store.email,
            address: store.address,
            description: store.description,
            logoUrl: store.logoUrl,
            bannerUrl: store.bannerUrl,
            themeColor: theme.color ?? null,
            themeFont: theme.font ?? null,
            socialInstagram: socialLinks.instagram ?? null,
            socialFacebook: socialLinks.facebook ?? null,
            socialTwitter: socialLinks.twitter ?? null,
            socialTiktok: socialLinks.tiktok ?? null,
            announcementText: store.announcementText,
            announcementEnabled: store.announcementEnabled,
            bankName: store.bankName,
            bankAccountNumber: store.bankAccountNumber,
            bankAccountName: store.bankAccountName,
            flutterwaveSubaccountId: store.flutterwaveSubaccountId,
            isPublished: store.isPublished,
            slug: store.slug,
          }}
        />
      </div>
    </div>
  );
}
