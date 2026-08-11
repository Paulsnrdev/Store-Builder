import type { Metadata } from "next";
import { StaticPageLayout } from "@/components/marketing/static-page-layout";

export const metadata: Metadata = { title: "Terms of Service — StoreHike" };

export default function TermsPage() {
  return (
    <StaticPageLayout title="Terms of Service">
      <p>Last updated: 2026.</p>
      <p>By creating a store or placing an order on StoreHike, you agree to these terms.</p>
      <h2>For sellers</h2>
      <p>
        You&apos;re responsible for the accuracy of your product listings, fulfilling orders you accept, and
        complying with applicable Nigerian consumer and tax law for your business. StoreHike provides the
        storefront, checkout, and order management tools — it is not a party to the sale between you and your
        customers.
      </p>
      <h2>For customers</h2>
      <p>
        Purchases are made directly with the seller operating the store. Refunds, exchanges, and delivery
        timelines are set by that seller, not by StoreHike.
      </p>
      <h2>Payments</h2>
      <p>
        Card payments are processed by Paystack under their own terms. Bank transfer and cash-on-delivery
        orders are confirmed manually by the seller.
      </p>
      <h2>Acceptable use</h2>
      <p>Stores may not sell illegal goods or services, or use StoreHike for fraudulent transactions.</p>
      <h2>Changes</h2>
      <p>We may update these terms as StoreHike evolves. Continued use after a change means you accept it.</p>
      <h2>Questions</h2>
      <p>
        Reach out via our <a href="/contact">Contact</a> page.
      </p>
    </StaticPageLayout>
  );
}
