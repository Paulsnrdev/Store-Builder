"use client";

import { useActionState, useState } from "react";
import { updateStoreSettings, type SettingsFormState } from "@/lib/actions/settings";
import { SingleImageUploader } from "@/components/dashboard/image-uploader";

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

export function SettingsForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(updateStoreSettings, initialState);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);

  return (
    <form action={formAction} className="max-w-lg space-y-6">
      <input type="hidden" name="logoUrl" value={logoUrl ?? ""} />
      <input type="hidden" name="bannerUrl" value={bannerUrl ?? ""} />

      <label className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={initial.isPublished} />
        <span>
          Publish store <span className="text-gray-400">— visible at /shop/{initial.slug}</span>
        </span>
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700">Store name</label>
        <input name="name" defaultValue={initial.name} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">About / description</label>
        <textarea
          name="description"
          defaultValue={initial.description ?? ""}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input name="phone" defaultValue={initial.phone ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">WhatsApp number</label>
          <input
            name="whatsappNumber"
            defaultValue={initial.whatsappNumber ?? ""}
            placeholder="+234..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={initial.email ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input name="address" defaultValue={initial.address ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <fieldset className="space-y-4 rounded-md border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Branding</legend>
        <SingleImageUploader value={logoUrl} onChange={setLogoUrl} label="Logo" />
        <SingleImageUploader value={bannerUrl} onChange={setBannerUrl} label="Banner (home page hero image)" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Accent color</label>
            <input
              name="themeColor"
              type="color"
              defaultValue={initial.themeColor ?? "#111827"}
              className="mt-1 h-9 w-full rounded-md border border-gray-300 px-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Font</label>
            <select
              name="themeFont"
              defaultValue={initial.themeFont ?? "sans"}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Announcement bar</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="announcementEnabled" defaultChecked={initial.announcementEnabled} />
          <span>Show a banner at the top of the storefront</span>
        </label>
        <input
          name="announcementText"
          defaultValue={initial.announcementText ?? ""}
          placeholder="e.g. Free shipping on orders over ₦50,000"
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </fieldset>

      <fieldset className="space-y-3 rounded-md border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Social links</legend>
        <input
          name="socialInstagram"
          defaultValue={initial.socialInstagram ?? ""}
          placeholder="Instagram URL"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="socialFacebook"
          defaultValue={initial.socialFacebook ?? ""}
          placeholder="Facebook URL"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="socialTwitter"
          defaultValue={initial.socialTwitter ?? ""}
          placeholder="X / Twitter URL"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="socialTiktok"
          defaultValue={initial.socialTiktok ?? ""}
          placeholder="TikTok URL"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </fieldset>

      <fieldset className="rounded-md border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Bank transfer details</legend>
        <p className="mb-3 text-xs text-gray-400">Shown to customers who pay by bank transfer.</p>
        <div className="space-y-3">
          <input
            name="bankName"
            defaultValue={initial.bankName ?? ""}
            placeholder="Bank name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="bankAccountNumber"
            defaultValue={initial.bankAccountNumber ?? ""}
            placeholder="Account number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="bankAccountName"
            defaultValue={initial.bankAccountName ?? ""}
            placeholder="Account name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-gray-700">Flutterwave subaccount ID</label>
        <p className="mb-1 text-xs text-gray-400">From your Flutterwave dashboard — routes card payments directly to you.</p>
        <input
          name="flutterwaveSubaccountId"
          defaultValue={initial.flutterwaveSubaccountId ?? ""}
          placeholder="RS_xxxxxxxx"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
