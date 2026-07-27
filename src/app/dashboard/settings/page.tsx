import { getCurrentStore } from "@/lib/store";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const store = await getCurrentStore();

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
            bankName: store.bankName,
            bankAccountNumber: store.bankAccountNumber,
            bankAccountName: store.bankAccountName,
            paystackSubaccountCode: store.paystackSubaccountCode,
            isPublished: store.isPublished,
            slug: store.slug,
          }}
        />
      </div>
    </div>
  );
}
