"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductPhoto } from "@/components/product-photo";
import { VerdictBadge } from "@/components/verdict-badge";
import { YoucamApis } from "@/components/youcam-apis";
import { listFaceProducts } from "@/lib/catalog";
import { HONEST_LABEL, merchantCartDecision, SHOPIFY_HANDOFF } from "@/lib/merchant";
import { SHOPIFY_GATE_LINE } from "@/lib/honesty";
import { latestScan } from "@/lib/progress";
import { addToCart, useGlow } from "@/lib/store";
import { suitProduct } from "@/lib/suitability";
import { sampleBaselineScan } from "@/lib/youcam/mock";

export function MerchantView() {
  const { ready, state, workspace } = useGlow();
  const products = useMemo(() => [...listFaceProducts()].sort((a, b) => a.name.localeCompare(b.name)), []);
  const [slug, setSlug] = useState("nighttimerepair");
  const sample = useMemo(() => sampleBaselineScan(), []);

  if (!ready) return <div className="h-80 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;

  const scan = latestScan(state);
  const usingSample = !scan && workspace === "mock";
  const baseline = scan ?? (usingSample ? sample : null);
  const product = products.find((item) => item.slug === slug) ?? products[0];
  const demo = !baseline || baseline.mode === "mock" || usingSample;
  const suit = product ? suitProduct(product, baseline) : null;
  const decision = suit ? merchantCartDecision(suit.verdict) : null;

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex flex-col gap-2">
        <p className="micro">GlowCheck for Shopify</p>
        <h1 className="font-display text-[28px] leading-[1.15] font-bold">Pre-cart skin check</h1>
        <p className="text-[15px] leading-snug text-[var(--ink-2)]">
          Beauty merchants can show Suit, Patch-test, or Skip before Add to cart. {SHOPIFY_GATE_LINE}
        </p>
        <p className="text-[13px] leading-snug text-[var(--ink-2)]">
          Storefront-style demo. Not a listed Shopify App Store app. No Partner credentials and no charge.
        </p>
      </div>

      <YoucamApis demo={demo} />

      <p className="rounded-[12px] bg-[var(--surface-warm)] px-4 py-3 text-[13px] leading-snug font-semibold" role="status">
        {workspace === "mock" || demo
          ? "Demo (no API call). Example scores only. YouCam is not called."
          : "Live YouCam scan. This gate uses that measured baseline."}
        {usingSample ? " Showing the sample-face baseline because Demo has no scan yet." : ""}
      </p>

      {!baseline && (
        <p className="rounded-[12px] bg-[var(--surface-2)] px-4 py-3 text-[14px]">
          Scan first in My scans, or switch to Demo (no API call). The gate needs a baseline.
        </p>
      )}

      {product && suit && decision && (
        <section className="flex flex-col gap-3 rounded-[16px] border border-[var(--line)] p-4">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            Catalog face SKU
            <select className="h-11 rounded-[8px] border border-[var(--line)] bg-white px-2 text-[14px]" value={product.slug} onChange={(event) => setSlug(event.target.value)}>
              {products.map((item) => (
                <option key={item.slug} value={item.slug}>{item.brand} · {item.name}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <ProductPhoto product={product} />
            <div className="min-w-0">
              <VerdictBadge verdict={suit.verdict} />
              <p className="mt-1 text-[16px] font-semibold">{product.name}</p>
              <p className="text-[13px] text-[var(--meta)]">{product.brand}</p>
            </div>
          </div>
          <p className="text-[14px] leading-snug">{suit.reasons[0]}</p>
          <p className="rounded-[12px] bg-[var(--surface-2)] px-3 py-3 text-[13px] leading-snug font-semibold">{HONEST_LABEL}</p>
          {decision.warning && (
            <p role="status" data-testid="merchant-skip-warning" className="rounded-[12px] border-l-[3px] border-[var(--skip)] bg-[var(--skip-bg)] px-3 py-3 text-[13px] leading-snug">
              {decision.warning}
            </p>
          )}
          <button
            type="button"
            className="btn-primary btn-lg w-full"
            data-testid="merchant-add"
            disabled={!decision.allowAdd || !baseline}
            onClick={() => {
              addToCart(product.slug);
              toast.success(SHOPIFY_HANDOFF);
            }}
          >
            Add to Shopify cart
          </button>
          <p className="text-[12px] leading-snug text-[var(--meta)]">{SHOPIFY_HANDOFF}</p>
          {product.shopUrl && (
            <a href={product.shopUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full">
              Open brand storefront
            </a>
          )}
        </section>
      )}
    </div>
  );
}
