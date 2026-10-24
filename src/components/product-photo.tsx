"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "/demo/product-placeholder.svg";

export function ProductPhoto({ product, className }: { product: Product; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? product.officialImageUrl : undefined;

  if (!src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={PLACEHOLDER} alt={product.name} className={className} />
    );
  }

  return (
    <span className={cn("relative block", className)}>
      <Image
        src={src}
        alt={product.name}
        fill
        sizes="200px"
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
