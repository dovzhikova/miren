"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductMark } from "@/components/product-mark";
import { VerdictBadge } from "@/components/verdict-badge";
import { CATEGORY_ORDER, formatPrice, houseBrand, listProducts, productCategory, routineTime } from "@/lib/catalog";
import { latestScan } from "@/lib/progress";
import { addToCart, useGlow } from "@/lib/store";
import { suitProduct, verdictRank } from "@/lib/suitability";
import type { SuitabilityVerdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const filters: Array<{ id: "all" | SuitabilityVerdict; label: string }> = [
  { id: "all", label: "All" },
  { id: "suits", label: "Suits you" },
  { id: "patch-test", label: "Patch-test" },
  { id: "skip", label: "Skip" },
];

export function ShopView() {
  const { ready, state } = useGlow();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const scan = latestScan(state);

  const rows = useMemo(() => {
    if (!ready) return [];
    return listProducts()
      .map((product) => ({ product, suit: suitProduct(product, scan) }))
      .sort((a, b) => verdictRank(a.suit.verdict) - verdictRank(b.suit.verdict) || a.product.name.localeCompare(b.product.name));
  }, [ready, scan]);

  if (!ready) return <div className="h-80 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;

  const counts = {
    all: rows.length,
    suits: rows.filter((row) => row.suit.verdict === "suits").length,
    "patch-test": rows.filter((row) => row.suit.verdict === "patch-test").length,
    skip: rows.filter((row) => row.suit.verdict === "skip").length,
  };
  const visible = rows.filter((row) => filter === "all" || row.suit.verdict === filter);
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: visible.filter((row) => productCategory(row.product.slug) === category),
  })).filter((group) => group.items.length);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="micro">Matched to your scan</p>
        <h1 className="mt-1 font-display text-[28px] leading-[1.15] font-bold">Must-have routine for you</h1>
        <p className="mt-2 text-[13px] text-[var(--ink-2)]">
          {scan
            ? "Skip stays on the list. A product you do not need is still a decision."
            : "Scan first if you want each product checked. Without a scan, treatments stay a patch-test."}
        </p>
      </div>

      <div className="flex gap-0.5 overflow-x-auto rounded-full bg-[var(--surface-2)] p-1">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "h-9 shrink-0 rounded-full px-3 text-[12px] font-semibold whitespace-nowrap",
              filter === item.id ? "bg-white text-[var(--ink)] shadow-[var(--sh-1)]" : "text-[var(--ink-2)]",
            )}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span className="num ml-1 text-[11px] text-[var(--meta)]">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 && <p className="text-[15px] text-[var(--ink-2)]">Nothing in this filter. Try All.</p>}

      {groups.map((group) => (
        <section key={group.category} className="flex flex-col gap-3">
          <h2 className="font-display text-[22px] leading-[1.2] font-bold">{group.category}</h2>
          {group.items.map(({ product, suit }) => {
            const inCart = state.cart.some((line) => line.productId === product.slug);
            return (
              <article key={product.slug} className="flex gap-3 border-b border-[var(--line)] pb-3">
                <Link href={`/shop/${product.slug}`} className={cn("grid h-[88px] w-[72px] shrink-0 place-items-center rounded-[16px] border border-[var(--line)] bg-white", suit.verdict === "skip" && "opacity-60")}>
                  <ProductMark name={product.name} className="h-16 w-14" />
                </Link>
                <div className="min-w-0 flex-1">
                  <VerdictBadge verdict={suit.verdict} />
                  <Link href={`/shop/${product.slug}`} className="mt-1 block text-[16px] leading-snug font-semibold">
                    {product.name}
                  </Link>
                  <p className="text-[13px] text-[var(--meta)]">{houseBrand()}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[13px] font-medium text-[var(--ink-2)]">{formatPrice(product.price)}</span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[13px] font-medium text-[var(--ink-2)]">{product.size}</span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[13px] font-medium text-[var(--ink-2)]">{routineTime(product)}</span>
                  </div>
                  <p className={cn("mt-2 text-[13px]", suit.verdict === "skip" ? "text-[var(--skip)]" : "text-[var(--ink-2)]")}>{suit.reasons[0]}</p>
                  <div className="mt-2 flex gap-2">
                    {product.tryOn.kind === "makeup" && (
                      <Link href={`/shop/${product.slug}#try-on`} className="btn-ghost h-11 px-2">
                        Try on
                      </Link>
                    )}
                    <button
                      type="button"
                      className="btn-secondary h-11"
                      disabled={inCart}
                      onClick={() => {
                        addToCart(product.slug);
                        toast.success(`${product.name} is in the cart`);
                      }}
                    >
                      {inCart ? "Added" : "Add"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
