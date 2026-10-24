"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "/demo/product-placeholder.svg";

/** Square packshot. Official CDN bytes load directly so a failed optimizer cannot blank the tile. */
export function ProductPhoto({
  product,
  frame = "tile",
  className,
  priority = false,
}: {
  product: Product;
  frame?: "tile" | "compact" | "hero";
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? product.officialImageUrl : undefined;

  return (
    <span
      className={cn(
        "relative block overflow-hidden rounded-[12px] bg-[var(--pack)]",
        frame === "hero" && "mx-auto aspect-square w-full max-w-[440px]",
        frame === "tile" && "size-28 shrink-0",
        frame === "compact" && "size-24 shrink-0",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-contain p-1.5"
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PLACEHOLDER} alt="" className="absolute inset-0 h-full w-full object-contain p-3" />
          <span className="absolute inset-x-1 bottom-1 text-center text-[10px] font-medium text-[var(--ink-2)]">Photo unavailable</span>
        </>
      )}
    </span>
  );
}
