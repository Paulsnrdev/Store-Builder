import type { Metadata } from "next";
import { StaticPageLayout } from "@/components/marketing/static-page-layout";

export const metadata: Metadata = { title: "Privacy Policy — StoreHike" };

export default function PrivacyPage() {
  return (
    <StaticPageLayout title="Privacy Policy">
      <p>Last updated: 2026.</p>
      <p>
        This page describes what information StoreHike collects and how it&apos;s used, for both sellers who
        create a store and customers who buy from one.
      </p>
      <h2>Information we collect</h2>
      <p>
        For sellers: your name, email, and password when you register, plus store details you add (name,
        description, logo, bank details for payouts). For customers: name, phone number, email (optional), and
        shipping address when you place an order.
      </p>
      <h2>How we use it</h2>
      <p>
        To operate your store or process your order — nothing more. We don&apos;t sell customer or seller data to
        third parties.
      </p>
      <h2>Payments</h2>
      <p>
        Card payments are processed by Flutterwave. We never see or store your full card details — those are
        handled entirely by Flutterwave&apos;s payment infrastructure.
      </p>
      <h2>Data retention</h2>
      <p>Order and account data is kept for as long as your store or account remains active.</p>
      <h2>Questions</h2>
      <p>
        Reach out via our <a href="/contact">Contact</a> page for anything not covered here.
      </p>
    </StaticPageLayout>
  );
}
