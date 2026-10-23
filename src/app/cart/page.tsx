import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = {
  title: "Cart",
  description: "Check whether each product suits your scan before you add it to a routine.",
};

export default function CartPage() {
  return <CartView />;
}
