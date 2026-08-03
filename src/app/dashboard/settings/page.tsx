import { getCurrentStore } from "@/lib/store";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

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
      <PageHeader title="Settings" />
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

      <div className="mt-10 max-w-lg">
        <h2 className="text-lg font-semibold text-gray-900">Password</h2>
        <p className="mt-1 text-sm text-gray-500">Only applies if you sign in with email and password.</p>
        <Card className="mt-3">
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
