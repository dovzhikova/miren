import type { Metadata } from "next";
import { MerchantView } from "@/components/merchant-view";

export const metadata: Metadata = {
  title: "For Shopify",
  description: "Demo pre-cart skin check for beauty merchants. A Storefront-style handoff, not a listed Shopify app.",
};

export default function MerchantPage() {
  return <MerchantView />;
}
