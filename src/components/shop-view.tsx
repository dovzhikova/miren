"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductPhoto } from "@/components/product-photo";
import { VerdictBadge } from "@/components/verdict-badge";
import { formatPrice, listFaceProducts, listMakeupProducts, matchScore, productCategory, routineRoleLabel } from "@/lib/catalog";
import { forYouProducts, makeupForYou } from "@/lib/recommend";
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
  const [browseAll, setBrowseAll] = useState(false);
  const scan = latestScan(state);
  const forYou = useMemo(() => (ready && scan ? forYouProducts(scan) : []), [ready, scan]);
  const makeup = useMemo(() => (ready && scan ? makeupForYou(scan) : []), [ready, scan]);

  const rows = useMemo(() => {
    if (!ready) return [];
    return listFaceProducts()
      .map((product) => ({ product, suit: suitProduct(product, scan) }))
      .sort(
        (a, b) =>
          verdictRank(a.suit.verdict) - verdictRank(b.suit.verdict) ||
          matchScore(b.product, scan) - matchScore(a.product, scan) ||
          a.product.name.localeCompare(b.product.name),
      );
  }, [ready, scan]);

  if (!ready) return <div className="h-80 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;

  const counts = {
    all: rows.length,
    suits: rows.filter((row) => row.suit.verdict === "suits").length,
    "patch-test": rows.filter((row) => row.suit.verdict === "patch-test").length,
    skip: rows.filter((row) => row.suit.verdict === "skip").length,
  };
  const visible = rows.filter((row) => filter === "all" || row.suit.verdict === filter);
  const groups = [...new Set(visible.map((row) => productCategory(row.product)))]
    .map((category) => ({
      category,
      items: visible.filter((row) => productCategory(row.product) === category),
    }))
    .filter((group) => group.items.length)
    .sort((a, b) => matchScore(b.items[0].product, scan) - matchScore(a.items[0].product, scan));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="micro">{browseAll ? "Full face catalog" : "For you"}</p>
        <h1 className="mt-1 font-display text-[28px] leading-[1.15] font-bold">
          {browseAll ? "Every face product" : "A short routine"}
        </h1>
        <p className="mt-2 text-[13px] text-[var(--ink-2)]">
          {browseAll
            ? "The full face list, still ranked by the scan. Prices are in ₪."
            : scan
              ? "The concerns under 75, a few steps, suits ahead of patch-test. Prices are in ₪."
              : "Scan first. Without a photo, a short list would only be a guess."}
        </p>
        <button type="button" className="btn-ghost mt-2 h-11 text-left" onClick={() => setBrowseAll((value) => !value)}>
          {browseAll ? "Back to For you" : "Browse all"}
        </button>
      </div>

      {!browseAll && scan && forYou.length === 0 && (
        <p className="text-[15px] text-[var(--ink-2)]">Nothing on the shelf suits the low scores. Browse all to see the rest.</p>
      )}

      {!browseAll && scan && forYou.length > 0 && (
        <section className="flex flex-col gap-3">
          {forYou.map((product) => {
            const suit = suitProduct(product, scan);
            const inCart = state.cart.some((line) => line.productId === product.slug);
            return (
              <article key={product.slug} className="flex gap-3 border-b border-[var(--line)] pb-3">
                <Link href={`/shop/${product.slug}`} className="grid h-[112px] w-[112px] shrink-0 place-items-center overflow-hidden rounded-[12px] bg-[var(--stage)]">
                  <ProductPhoto product={product} className="h-full w-full object-contain" />
                </Link>
                <div className="min-w-0 flex-1">
                  <VerdictBadge verdict={suit.verdict} />
                  <Link href={`/shop/${product.slug}`} className="mt-1 block text-[16px] leading-snug font-semibold">
                    {product.name}
                  </Link>
                  <p className="text-[13px] text-[var(--meta)]">
                    {product.brand} · {routineRoleLabel(product.routineRole)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[13px] font-medium text-[var(--ink-2)]">{formatPrice(product.price)}</span>
                    {product.size && <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[13px] font-medium text-[var(--ink-2)]">{product.size}</span>}
                  </div>
                  <p className="mt-2 text-[13px] text-[var(--ink-2)]">{suit.reasons[0]}</p>
                  {suit.warningNote && <p className="mt-1 text-[12px] text-[var(--meta)]">{suit.warningNote}</p>}
                  <button
                    type="button"
                    className="btn-bag mt-2"
                    disabled={inCart}
                    onClick={() => {
                      addToCart(product.slug);
                      toast.success(`${product.name} is in the cart`);
                    }}
                  >
                    {inCart ? "Added" : "Add"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!browseAll && scan && makeup.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <p className="micro">Makeup for you</p>
            <h2 className="font-display text-[22px] leading-[1.2] font-bold">Colour that fits</h2>
          </div>
          {makeup.map((product) => {
            const suit = suitProduct(product, scan);
            const inCart = state.cart.some((line) => line.productId === product.slug);
            return (
              <article key={product.slug} className="flex gap-3 border-b border-[var(--line)] pb-3">
                <Link href={`/shop/${product.slug}`} className="grid h-[112px] w-[112px] shrink-0 place-items-center overflow-hidden rounded-[12px] bg-[var(--stage)]">
                  <ProductPhoto product={product} className="h-full w-full object-contain" />
                </Link>
                <div className="min-w-0 flex-1">
                  <VerdictBadge verdict={suit.verdict} />
                  <Link href={`/shop/${product.slug}`} className="mt-1 block text-[16px] leading-snug font-semibold">
                    {product.name}
                  </Link>
                  <p className="text-[13px] text-[var(--meta)]">
                    {product.brand} · {product.category}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--ink-2)]">{suit.reasons[0]}</p>
                  <div className="mt-2 flex gap-2">
                    <Link href={`/shop/${product.slug}#try-on`} className="btn-ghost h-11 px-2">
                      Try on
                    </Link>
                    <button
                      type="button"
                      className="btn-bag"
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
      )}

      {browseAll && (
      <>
      <div className="flex gap-1 overflow-x-auto">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "h-9 shrink-0 rounded-full border border-transparent px-3 text-[12px] font-semibold whitespace-nowrap",
              filter === item.id ? "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--ink-2)]",
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
                <Link href={`/shop/${product.slug}`} className={cn("grid h-[112px] w-[112px] shrink-0 place-items-center overflow-hidden rounded-[12px] bg-[var(--stage)]", suit.verdict === "skip" && "opacity-60")}>
                  <ProductPhoto product={product} className="h-full w-full object-contain" />
                </Link>
                <div className="min-w-0 flex-1">
                  <VerdictBadge verdict={suit.verdict} />
                  <Link href={`/shop/${product.slug}`} className="mt-1 block text-[16px] leading-snug font-semibold">
                    {product.name}
                  </Link>
                  <p className="text-[13px] text-[var(--meta)]">{product.brand}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[13px] font-medium text-[var(--ink-2)]">{formatPrice(product.price)}</span>
                    {product.size && <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[13px] font-medium text-[var(--ink-2)]">{product.size}</span>}
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[13px] font-medium text-[var(--ink-2)]">{product.category}</span>
                  </div>
                  <p className={cn("mt-2 text-[13px]", suit.verdict === "skip" ? "text-[var(--skip)]" : "text-[var(--ink-2)]")}>{suit.reasons[0]}</p>
                  {suit.warningNote && <p className="mt-1 text-[12px] text-[var(--meta)]">{suit.warningNote}</p>}
                  <div className="mt-2 flex gap-2">
                    {product.tryOn.kind === "makeup" && (
                      <Link href={`/shop/${product.slug}#try-on`} className="btn-ghost h-11 px-2">
                        Try on
                      </Link>
                    )}
                    <button
                      type="button"
                      className="btn-bag"
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
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] leading-[1.2] font-bold">Makeup</h2>
        {listMakeupProducts().map((product) => {
          const suit = suitProduct(product, scan);
          const inCart = state.cart.some((line) => line.productId === product.slug);
          return (
            <article key={product.slug} className="flex gap-3 border-b border-[var(--line)] pb-3">
              <Link href={`/shop/${product.slug}`} className="grid h-[112px] w-[112px] shrink-0 place-items-center overflow-hidden rounded-[12px] bg-[var(--stage)]">
                <ProductPhoto product={product} className="h-full w-full object-contain" />
              </Link>
              <div className="min-w-0 flex-1">
                <VerdictBadge verdict={suit.verdict} />
                <Link href={`/shop/${product.slug}`} className="mt-1 block text-[16px] leading-snug font-semibold">
                  {product.name}
                </Link>
                <p className="text-[13px] text-[var(--meta)]">
                  {product.brand} · {formatPrice(product.price)}
                </p>
                <div className="mt-2 flex gap-2">
                  <Link href={`/shop/${product.slug}#try-on`} className="btn-ghost h-11 px-2">
                    Try on
                  </Link>
                  <button
                    type="button"
                    className="btn-bag"
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
      </>
      )}
    </div>
  );
}
