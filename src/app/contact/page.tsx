import type { Metadata } from "next";
import { StaticPageLayout } from "@/components/marketing/static-page-layout";

export const metadata: Metadata = { title: "Contact — StoreHike" };

export default function ContactPage() {
  return (
    <StaticPageLayout title="Contact us">
      <p>Have a question, found a bug, or need help with your store? Reach us here:</p>
      <h2>Email</h2>
      <p>
        <a href="mailto:support@storehike.site">support@storehike.site</a>
      </p>
      <h2>Already have a store?</h2>
      <p>
        For order or payment issues on a specific store, log in to your <a href="/login">dashboard</a> first —
        most account details help us resolve things faster.
      </p>
    </StaticPageLayout>
  );
}
