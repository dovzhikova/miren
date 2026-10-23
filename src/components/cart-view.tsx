"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ProductMark } from "@/components/product-mark";
import { VerdictBadge } from "@/components/verdict-badge";
import { WhySheet } from "@/components/why-sheet";
import { formatPrice, getProduct, listProducts } from "@/lib/catalog";
import { latestScan } from "@/lib/progress";
import { addToCart, checkout, removeFromCart, setQty, useGlow } from "@/lib/store";
import { suitProduct } from "@/lib/suitability";

export function CartView() {
  const router = useRouter();
  const { ready, state } = useGlow();
  const [kept, setKept] = useState<string[]>([]);
  const [how, setHow] = useState(false);
  const scan = latestScan(state);

  if (!ready) return <div className="h-64 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;

  const lines = state.cart
    .map((line) => {
      const product = getProduct(line.productId);
      if (!product) return null;
      return { line, product, suit: suitProduct(product, scan) };
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line));

  const skips = lines.filter((line) => line.suit.verdict === "skip");
  const patches = lines.filter((line) => line.suit.verdict === "patch-test");
  const suits = lines.filter((line) => line.suit.verdict === "suits");
  const keepers = lines.filter((line) => line.suit.verdict !== "skip");
  const total = lines.reduce((sum, item) => sum + item.product.price * item.line.qty, 0);

  function buy(ids?: string[]) {
    const ok = checkout(ids);
    if (!ok) {
      toast.error("Scan first so the routine has a baseline.");
      return;
    }
    toast.success("Added to your routine. Nothing was charged.");
    router.push("/progress");
  }

  if (!lines.length) {
    return (
      <div className="flex flex-col gap-3 py-8">
        <h1 className="font-display text-[28px] font-bold">The cart is empty</h1>
        <p className="text-[var(--ink-2)]">Add a product after the suitability check. Checkout here is a demo. Nothing is charged.</p>
        <Link href="/shop" className="btn-primary w-full">
          Browse the shelf
        </Link>
      </div>
    );
  }

  const headline =
    skips.length === 1
      ? "Cart check: 1 product doesn't suit your skin"
      : skips.length > 1
        ? `Cart check: ${skips.length} products don't suit your skin`
        : "Cart check: nothing here is a skip";

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-[28px] font-bold">Cart</h1>
      <section className="rounded-[20px] bg-[var(--surface-warm)] p-4">
        <p className="text-[15px] font-semibold">{headline}</p>
        <p className="num mt-2 text-[13px] text-[var(--ink-2)]">
          Suits {suits.length} · Patch-test {patches.length} · Skip {skips.length}
        </p>
        <p className="mt-2 text-[13px] text-[var(--meta)]">Advice, not a lock. Checkout still works.</p>
        {skips.length > 0 && keepers.length > 0 && (
          <button type="button" className="btn-ghost mt-2 h-11" onClick={() => buy(keepers.map((line) => line.product.slug))}>
            Add the matches only
          </button>
        )}
      </section>

      <div className="flex flex-col gap-4">
        {lines.map(({ line, product, suit }) => {
          const alternative = listProducts()
            .filter((item) => item.slug !== product.slug && !state.cart.some((cartLine) => cartLine.productId === item.slug))
            .map((item) => ({ item, suit: suitProduct(item, scan) }))
            .find((item) => item.suit.verdict === "suits");
          const showSkip = suit.verdict === "skip" && !kept.includes(product.slug);
          return (
            <article key={product.slug} className="border-b border-[var(--line)] pb-4">
              <div className="flex gap-3">
                <div className="grid h-[88px] w-[72px] shrink-0 place-items-center rounded-[16px] border border-[var(--line)]">
                  <ProductMark name={product.name} className="h-16 w-14" />
                </div>
                <div className="min-w-0 flex-1">
                  <VerdictBadge verdict={suit.verdict} />
                  <p className="mt-1 text-[16px] font-semibold">{product.name}</p>
                  <p className="num text-[13px] text-[var(--meta)]">{formatPrice(product.price)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" className="grid size-11 place-items-center rounded-full bg-[var(--surface-2)] text-lg" aria-label="Decrease quantity" onClick={() => setQty(product.slug, line.qty - 1)}>
                      −
                    </button>
                    <span className="num w-4 text-center text-[15px] font-semibold">{line.qty}</span>
                    <button type="button" className="grid size-11 place-items-center rounded-full bg-[var(--surface-2)] text-lg" aria-label="Increase quantity" onClick={() => setQty(product.slug, line.qty + 1)}>
                      +
                    </button>
                    <button type="button" className="ml-auto text-[13px] font-semibold text-[var(--meta)]" onClick={() => removeFromCart(product.slug)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
              {showSkip && (
                <div className="mt-3 rounded-[16px] border-l-[3px] border-[var(--skip)] bg-[var(--skip-bg)] px-3 py-3 text-[13px] text-[var(--ink)]">
                  <p>{suit.reasons[0]}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {alternative && (
                      <button
                        type="button"
                        className="font-semibold text-[var(--brand)]"
                        onClick={() => {
                          removeFromCart(product.slug);
                          addToCart(alternative.item.slug);
                          toast.success(`Swapped in ${alternative.item.name}`);
                        }}
                      >
                        Swap for {alternative.item.name}
                      </button>
                    )}
                    <button type="button" className="font-semibold text-[var(--ink-2)]" onClick={() => setKept((current) => [...current, product.slug])}>
                      Keep anyway
                    </button>
                  </div>
                </div>
              )}
              {suit.verdict === "patch-test" && (
                <div className="mt-3 rounded-[16px] border-l-[3px] border-[var(--patch)] bg-[var(--patch-bg)] px-3 py-3 text-[13px]">
                  Try on your jaw for 24h first.{" "}
                  <button type="button" className="font-semibold text-[var(--brand)]" onClick={() => setHow(true)}>
                    How to patch-test
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="sticky-bar flex items-center gap-3">
        <div>
          <p className="num text-[18px] font-bold">{formatPrice(total)}</p>
          <p className="text-[12px] text-[var(--meta)]">Demo total</p>
        </div>
        <button type="button" className="btn-primary min-w-0 flex-1" data-testid="checkout" onClick={() => buy()}>
          Checkout
        </button>
      </div>

      <WhySheet open={how} title="How to patch-test" onClose={() => setHow(false)}>
        <p>Put a pea-size amount along the jaw, once a day, for 24 hours. Leave the rest of the face alone.</p>
        <p>Stinging that fades in a minute is common. Spreading redness, burning, or swelling means stop and skip it.</p>
        <p>The follow-up scan is the second opinion, after about two weeks of actual use.</p>
      </WhySheet>
    </div>
  );
}
