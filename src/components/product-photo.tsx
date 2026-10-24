"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "/demo/product-placeholder.svg";

/** List, cart, and results tiles are about 112px. Ask for 2–3× that. */
export const LIST_PHOTO_SIZES = "(max-width: 440px) 112px, 112px";

export function ProductPhoto({
  product,
  className,
  sizes = LIST_PHOTO_SIZES,
  priority = false,
}: {
  product: Product;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? product.officialImageUrl : undefined;

  if (!src) {
    return (
      <span className={cn("relative grid place-items-center", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PLACEHOLDER} alt="" className="h-full w-full object-contain" />
        <span className="absolute bottom-1 inset-x-1 text-center text-[10px] text-[var(--meta)]">Photo unavailable</span>
      </span>
    );
  }

  return (
    <span className={cn("relative block", className)}>
      <Image
        src={src}
        alt={product.name}
        fill
        sizes={sizes}
        quality={90}
        priority={priority}
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
