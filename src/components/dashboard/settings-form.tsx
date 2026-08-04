"use client";

import { useActionState, useState } from "react";
import { updateStoreSettings, type SettingsFormState } from "@/lib/actions/settings";
import { SingleImageUploader } from "@/components/dashboard/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Initial = {
  name: string;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  themeColor: string | null;
  themeFont: string | null;
  socialInstagram: string | null;
  socialFacebook: string | null;
  socialTwitter: string | null;
  socialTiktok: string | null;
  announcementText: string | null;
  announcementEnabled: boolean;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  flutterwaveSubaccountId: string | null;
  isPublished: boolean;
  slug: string;
};

const initialState: SettingsFormState = {};

export function SettingsForm({ initial, canCustomizeTheme = true }: { initial: Initial; canCustomizeTheme?: boolean }) {
  const [state, formAction, pending] = useActionState(updateStoreSettings, initialState);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);

  return (
    <form action={formAction} className="max-w-lg space-y-6">
      <input type="hidden" name="logoUrl" value={logoUrl ?? ""} />
      <input type="hidden" name="bannerUrl" value={bannerUrl ?? ""} />

      <label className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={initial.isPublished} className="accent-brand-600" />
        <span>
          Publish store <span className="text-gray-400">— visible at /shop/{initial.slug}</span>
        </span>
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700">Store name</label>
        <Input name="name" defaultValue={initial.name} required className="mt-1" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">About / description</label>
        <Textarea name="description" defaultValue={initial.description ?? ""} rows={3} className="mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <Input name="phone" defaultValue={initial.phone ?? ""} className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">WhatsApp number</label>
          <Input name="whatsappNumber" defaultValue={initial.whatsappNumber ?? ""} placeholder="+234..." className="mt-1" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <Input name="email" type="email" defaultValue={initial.email ?? ""} className="mt-1" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <Input name="address" defaultValue={initial.address ?? ""} className="mt-1" />
      </div>

      <fieldset className="space-y-4 rounded-md border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Branding</legend>
        <SingleImageUploader value={logoUrl} onChange={setLogoUrl} label="Logo" />
        <SingleImageUploader value={bannerUrl} onChange={setBannerUrl} label="Banner (home page hero image)" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Accent color</label>
            {/* This sets the SELLER's own storefront accent color (--store-primary) —
                unrelated to the dashboard's brand color, kept as a plain color input. */}
            <input
              name="themeColor"
              type="color"
              defaultValue={initial.themeColor ?? "#111827"}
              className="mt-1 h-9 w-full rounded-md border border-gray-300 px-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Font</label>
            <Select name="themeFont" defaultValue={initial.themeFont ?? "sans"} disabled={!canCustomizeTheme} className="mt-1">
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
            </Select>
            {!canCustomizeTheme && (
              <p className="mt-1 text-xs text-gray-400">
                Font choice is available on the Basic plan and above.{" "}
                <a href="/dashboard/billing" className="font-medium text-brand-600 hover:underline">
                  Upgrade
                </a>
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Announcement bar</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="announcementEnabled" defaultChecked={initial.announcementEnabled} className="accent-brand-600" />
          <span>Show a banner at the top of the storefront</span>
        </label>
        <Input
          name="announcementText"
          defaultValue={initial.announcementText ?? ""}
          placeholder="e.g. Free shipping on orders over ₦50,000"
          className="mt-3"
        />
      </fieldset>

      <fieldset className="space-y-3 rounded-md border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Social links</legend>
        <Input name="socialInstagram" defaultValue={initial.socialInstagram ?? ""} placeholder="Instagram URL" />
        <Input name="socialFacebook" defaultValue={initial.socialFacebook ?? ""} placeholder="Facebook URL" />
        <Input name="socialTwitter" defaultValue={initial.socialTwitter ?? ""} placeholder="X / Twitter URL" />
        <Input name="socialTiktok" defaultValue={initial.socialTiktok ?? ""} placeholder="TikTok URL" />
      </fieldset>

      <fieldset className="rounded-md border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Bank transfer details</legend>
        <p className="mb-3 text-xs text-gray-400">Shown to customers who pay by bank transfer.</p>
        <div className="space-y-3">
          <Input name="bankName" defaultValue={initial.bankName ?? ""} placeholder="Bank name" />
          <Input name="bankAccountNumber" defaultValue={initial.bankAccountNumber ?? ""} placeholder="Account number" />
          <Input name="bankAccountName" defaultValue={initial.bankAccountName ?? ""} placeholder="Account name" />
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-gray-700">Flutterwave subaccount ID</label>
        <p className="mb-1 text-xs text-gray-400">From your Flutterwave dashboard — routes card payments directly to you.</p>
        <Input name="flutterwaveSubaccountId" defaultValue={initial.flutterwaveSubaccountId ?? ""} placeholder="RS_xxxxxxxx" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
