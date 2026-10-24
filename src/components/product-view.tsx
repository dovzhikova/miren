"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookmarkIcon } from "lucide-react";
import { toast } from "sonner";
import { ProductPhoto } from "@/components/product-photo";
import { ScoreBar } from "@/components/score-bar";
import { VerdictBadge } from "@/components/verdict-badge";
import { WhySheet } from "@/components/why-sheet";
import { formatPrice, getProduct, ingredientPills } from "@/lib/catalog";
import { concernLabel } from "@/lib/concerns";
import { dataUrlToFile, previewDataUrl, requestTryOn, type TryOnResult } from "@/lib/photos";
import { readPhoto } from "@/lib/photo-vault";
import { latestScan } from "@/lib/progress";
import { addToCart, toggleSaved, useGlow } from "@/lib/store";
import { suitProduct } from "@/lib/suitability";
import { cn } from "@/lib/utils";

export function ProductView({ slug }: { slug: string }) {
  const { ready, state, workspace } = useGlow();
  if (!ready) return <div className="h-80 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;
  return <ProductContent key={`${workspace}:${state.scans[0]?.id}:${slug}`} slug={slug} />;
}

function ProductContent({ slug }: { slug: string }) {
  const product = getProduct(slug);
  const { ready, state } = useGlow();
  const requestRef = useRef<AbortController | null>(null);
  const whyTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [restoredPhoto, setRestoredPhoto] = useState<string>();
  const [why, setWhy] = useState(false);

  if (!product) return null;
  if (!ready) return <div className="h-80 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;

  const scan = latestScan(state);
  const suit = suitProduct(product, scan);
  const saved = state.savedProductIds.includes(product.slug);
  const inCart = state.cart.some((line) => line.productId === product.slug);
  const photo = scan?.previewDataUrl ?? restoredPhoto;
  const after = result?.resultUrl || photo;

  async function preview() {
    if (!scan || !product) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    try {
      // Never send the display thumbnail to the live API.
      const source = await readPhoto(scan.id);
      const file = source ?? (scan.mode === "mock" && photo ? dataUrlToFile(photo) : null);
      if (!file) throw new Error("The original photo is no longer on this device. Take a new scan to restore previews.");
      if (!photo) {
        const thumbnail = await previewDataUrl(file);
        controller.signal.throwIfAborted();
        setRestoredPhoto(thumbnail);
      }
      setResult(await requestTryOn(file, product.slug, scan.mode, controller.signal));
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "The preview failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="micro">{product.brand}</p>
        <div className="mt-3 overflow-hidden rounded-[12px] bg-[var(--stage)]">
          <ProductPhoto
            product={product}
            priority
            sizes="(max-width: 440px) 90vw, 480px"
            className="mx-auto h-[320px] w-full object-contain"
          />
        </div>
        <h1 className="mt-4 font-display text-[28px] leading-[1.15] font-bold">{product.name}</h1>
        <div className="mt-3">
          <VerdictBadge verdict={suit.verdict} />
        </div>
        <p className="num mt-3 text-[15px] font-semibold">
          {formatPrice(product.price)}
          {product.size ? ` · ${product.size}` : ""} · {product.category}
          {!product.inStock ? " · Out of stock" : ""}
        </p>
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(`${product.brand} ${product.name}`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex h-11 items-center text-[15px] font-semibold text-[var(--brand)]"
        >
          Search this product
        </a>
        <p className="mt-3 text-[15px] text-[var(--ink-2)]">{product.summary}</p>
        {suit.warningNote && <p className="mt-2 text-[13px] leading-[1.4] text-[var(--meta)]">{suit.warningNote}</p>}
        <button type="button" ref={whyTrigger} className="btn-ghost mt-2 h-11" onClick={() => setWhy(true)}>
          Why this verdict
        </button>
      </div>

      {scan && product.concerns.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[22px] font-bold">Fit on your scores</h2>
          <p className="text-[13px] text-[var(--ink-2)]">Catalog weights come from the supplied product export and concern-tag mappings. They rank matches; they are not clinical efficacy measurements.</p>
          {product.concerns.map((id) => {
            const item = scan.concerns.find((row) => row.id === id);
            if (!item) return null;
            return (
              <div key={id}>
                <p className="mb-1 text-[15px] font-semibold">
                  {concernLabel(id)}
                  <span className="num ml-2 text-[13px] font-medium text-[var(--meta)]">Catalog {Math.round((product.concernScores[id] ?? 0) * 100)}</span>
                </p>
                <ScoreBar value={item.uiScore} label={item.label} />
              </div>
            );
          })}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {ingredientPills(product).map((pill) => (
          <span key={pill} className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[13px] font-medium text-[var(--ink-2)]">
            {pill}
          </span>
        ))}
      </div>
      <p className="text-[13px] text-[var(--meta)]">{product.howToUse}</p>

      <section id="try-on" className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] font-bold">{product.tryOn.label}</h2>
        <p className="text-[13px] text-[var(--ink-2)]">
          {product.tryOn.kind === "makeup"
            ? "A virtual colour preview. Screen colour can vary."
            : "An illustrative skin simulation, not a prediction of what this product will do."}
        </p>
        {!scan ? (
          <p className="rounded-[16px] bg-[var(--surface-2)] px-4 py-3 text-[13px]">Scan first. The preview uses the photo already on this device.</p>
        ) : (
          <>
            <button type="button" className="btn-secondary w-fit" onClick={preview} disabled={busy} data-testid="try-on">
              {busy ? "Asking YouCam…" : result ? "Refresh preview" : product.tryOn.label}
            </button>
            {result && after && photo && (
              <BeforeAfter before={photo} after={after} live={Boolean(result.resultUrl)} makeup={product.tryOn.kind === "makeup"} />
            )}
          </>
        )}
        {error && <p role="alert" className="text-[13px] text-[var(--skip)]">{error}</p>}
        <p className="text-[12px] text-[var(--meta)]">{scan?.mode === "mock" ? "Demo preview: this uses the saved photo and a generated example. No YouCam render is requested." : "Your saved source photo is sent to YouCam to create this preview."}</p>
        {result && scan?.mode === "mock" && (
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-[13px] font-semibold">Demo request details</summary>
            <pre tabIndex={0} role="region" aria-label="Demo API request" className="overflow-x-auto rounded-[16px] bg-[var(--surface-2)] p-3 text-[11px] leading-relaxed">{JSON.stringify(result.preview, null, 2)}</pre>
          </details>
        )}
      </section>

      {!scan && (
        <Link href="/scan" className="btn-secondary w-fit">
          Scan to check it
        </Link>
      )}

      <div className="sticky-bar flex items-center gap-3">
        <button
          type="button"
          className="btn-primary min-w-0 flex-1"
          disabled={inCart}
          data-testid="add-to-cart"
          onClick={() => {
            addToCart(product.slug);
            toast.success(`${product.name} is in the cart`);
          }}
        >
          {inCart ? "In the cart" : "Add to cart"}
        </button>
        <button
          type="button"
          className="grid size-12 shrink-0 place-items-center rounded-[8px] bg-[var(--surface-2)]"
          aria-label={saved ? "Unsave product" : "Save product"}
          aria-pressed={saved}
          onClick={() => {
            toggleSaved(product.slug);
            toast.success(saved ? "Product removed from Saved" : "Product saved on this device");
          }}
        >
          <BookmarkIcon className="size-5" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <WhySheet returnFocus={whyTrigger} open={why} title={suit.title} onClose={() => setWhy(false)}>
        <VerdictBadge verdict={suit.verdict} />
        {suit.reasons.map((reason) => (
          <p key={reason}>{reason}</p>
        ))}
        {suit.warningNote && <p className="text-[13px] text-[var(--meta)]">{suit.warningNote}</p>}
      </WhySheet>
    </div>
  );
}

function BeforeAfter({
  before,
  after,
  live,
  makeup,
}: {
  before: string;
  after: string;
  live: boolean;
  makeup: boolean;
}) {
  const [split, setSplit] = useState(56);
  return (
    <figure>
    <div
      className="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-[var(--stage)] select-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt="Before" className="absolute inset-0 h-full w-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after}
        alt={live ? "YouCam try-on result" : "Sample preview"}
        className={cn("absolute inset-0 h-full w-full object-cover", makeup && !live && "saturate-125")}
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
      />
      {makeup && !live && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - split}% 0 0)`,
            background: "linear-gradient(to bottom, transparent 46%, rgba(166, 72, 78, 0.35) 58%, transparent 72%)",
          }}
        />
      )}
      <div className="absolute inset-y-0 z-10 w-0.5 bg-white shadow-[var(--sh-2)]" style={{ left: `${split}%` }}>
        <span className="absolute top-1/2 -left-[18px] grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-[11px] font-semibold shadow-[var(--sh-2)]">
          ||
        </span>
      </div>
      <span className="absolute top-3 left-3 rounded-full bg-black/50 px-2 py-1 text-[12px] text-white">Before</span>
      <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-1 text-[12px] text-white">{live ? "Preview" : "Demo"}</span>
    </div>
    <label className="mt-3 flex flex-col gap-2 text-[13px]">Compare before and preview
      <input type="range" min="12" max="88" value={split} onChange={(event) => setSplit(Number(event.target.value))} aria-label="Before and preview split" className="w-full" />
    </label>
    </figure>
  );
}
