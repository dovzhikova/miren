"use client";

import type { Product } from "@/lib/types";

const PLACEHOLDER = "/demo/product-placeholder.svg";

export function ProductPhoto({ product, className }: { product: Product; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={PLACEHOLDER} alt={product.name} className={className} />
  );
}
