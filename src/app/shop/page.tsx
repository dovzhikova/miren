import type { Metadata } from "next";
import { ShopView } from "@/components/shop-view";

export const metadata: Metadata = {
  title: "Shelf",
  description: "A demo skincare shelf checked against your latest scan.",
};

export default function ShopPage() {
  return <ShopView />;
}
