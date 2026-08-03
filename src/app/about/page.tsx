import type { Metadata } from "next";
import { StaticPageLayout } from "@/components/marketing/static-page-layout";

export const metadata: Metadata = { title: "About — StoreHike" };

export default function AboutPage() {
  return (
    <StaticPageLayout title="About StoreHike">
      <p>
        StoreHike exists for one reason: too many sellers are running real businesses out of Instagram DMs and
        WhatsApp chats, manually copying order details, chasing screenshots of bank transfers, and losing track
        of stock in their heads.
      </p>
      <p>
        We give those sellers a real, hosted storefront — with a proper cart, checkout, shipping by state, and
        an order dashboard — without needing to write a line of code or hire a developer.
      </p>
      <h2>What we&apos;re building</h2>
      <p>
        StoreHike is in active development. New features ship regularly, and we build them based on what actual
        sellers ask for, not what looks good in a pitch deck.
      </p>
      <h2>Get in touch</h2>
      <p>
        Questions, feedback, or something broken? Visit our <a href="/contact">Contact</a> page.
      </p>
    </StaticPageLayout>
  );
}
