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
  return <ProductContent key={`${workspace}:${ready ? state.scans[0]?.id : "pending"}:${slug}`} slug={slug} />;
}

function ProductContent({ slug }: { slug: string }) {
  const product = getProduct(slug);
  const { ready, state } = useGlow();
  const requestRef = useRef<AbortController | null>(null);
  const whyTrigger = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  useEffect(() => () => requestRef.current?.abort(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [restoredPhoto, setRestoredPhoto] = useState<string>();
  const [why, setWhy] = useState(false);

  const scan = ready ? latestScan(state) : null;
  const photo = scan?.previewDataUrl ?? restoredPhoto;

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

  useEffect(() => {
    if (!ready || !scan) return;
    const params = new URLSearchParams(window.location.search);
    const wants = params.get("try") === "1" || window.location.hash === "#try-on";
    if (!wants) return;
    const timer = window.setTimeout(() => {
      if (started.current) return;
      started.current = true;
      void preview();
    }, 0);
    return () => window.clearTimeout(timer);
    // The click that opened ?try=1 already asked for this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, scan?.id]);

  if (!product) return null;

  const suit = suitProduct(product, scan);
  const saved = state.savedProductIds.includes(product.slug);
  const inCart = state.cart.some((line) => line.productId === product.slug);
  const makeup = product.tryOn.kind === "makeup";
  const rendered = Boolean(result?.resultUrl);
  const after = result?.resultUrl || "";
  const tryOnLabel = busy ? (scan?.mode === "live" ? "Asking YouCam…" : "Checking…") : result ? "Refresh preview" : product.tryOn.label;
  const showMakeupBar = makeup && ready && Boolean(scan);

  return (
    <div className={cn("flex flex-col gap-4 sm:gap-6", showMakeupBar && "max-md:pb-24", !makeup && "pb-24")}>
      <div>
        <p className="micro">{product.brand}</p>
        <h1 className="mt-1 font-display text-[22px] leading-[1.1] font-bold min-[390px]:mt-2 min-[390px]:text-[32px] sm:text-[40px]">{product.name}</h1>
        <p className="num mt-2 text-[15px] font-semibold min-[390px]:mt-3">
          {formatPrice(product.price)}
          {product.size ? ` · ${product.size}` : ""} · {product.category}
          {!product.inStock ? " · Out of stock" : ""}
        </p>
      </div>

      <section id="try-on" className="flex flex-col gap-3">
        {!ready ? (
          <p className="text-[13px] text-[var(--meta)]">Loading the scan photo…</p>
        ) : !scan ? (
          <p className="rounded-[16px] bg-[var(--surface-2)] px-4 py-3 text-[13px]">Scan first. The preview uses the photo already on this device.</p>
        ) : (
          <div className={cn("grid items-start gap-3", photo && "sm:grid-cols-2")}>
            {photo && (
              <figure className="order-1 overflow-hidden rounded-[12px] bg-[var(--pack)] sm:order-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="Face photo for try-on" className="aspect-[4/5] max-h-[42dvh] w-full object-cover object-top max-[389px]:aspect-auto max-[389px]:h-[168px] sm:aspect-square sm:max-h-none sm:object-center" />
                <figcaption className="px-3 py-2 text-[12px] font-medium text-[var(--ink-2)]">Scan photo</figcaption>
              </figure>
            )}
            <ProductPhoto product={product} frame="hero" priority className={photo ? "order-2 sm:order-1 max-sm:mx-auto max-sm:max-w-[220px]" : undefined} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={suit.verdict} />
          <span className="inline-flex rounded-full border border-[var(--line)] px-3 py-1 text-[12px] font-semibold">
            {makeup ? "Powered by YouCam Makeup VTO" : "YouCam skin simulation"}
          </span>
        </div>
        <p className="max-w-[40rem] text-[15px] text-[var(--ink-2)]">{product.summary}</p>
        {ready && scan && (
          <p className="text-[13px] text-[var(--ink-2)]">
            {makeup
              ? "A virtual colour preview on this photo. Screen colour can vary."
              : "An illustrative skin simulation, not a prediction of what this product will do."}
          </p>
        )}
        {rendered && photo && after && (
          <BeforeAfter before={photo} after={after} makeup={makeup} />
        )}
        {result && !rendered && (
          <p role="status" className="rounded-[12px] bg-[var(--surface-2)] px-4 py-3 text-[13px] leading-snug text-[var(--ink)]">
            Try-on did not run. This demo did not send the photo to YouCam.
          </p>
        )}
        {error && <p role="alert" className="text-[13px] text-[var(--skip)]">{error}</p>}
        {result && scan?.mode === "mock" && (
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-[13px] font-semibold">Request that would be sent</summary>
            <pre tabIndex={0} role="region" aria-label="Demo API request" className="overflow-x-auto rounded-[16px] bg-[var(--surface-2)] p-3 text-[11px] leading-relaxed">{JSON.stringify(result.preview, null, 2)}</pre>
          </details>
        )}
        {ready && scan && !makeup && (
          <button type="button" className="btn-primary btn-lg w-full" onClick={preview} disabled={busy} data-testid="try-on">
            {tryOnLabel}
          </button>
        )}
        {showMakeupBar && (
          <div className="sticky-bar sticky-bar-flow">
            <button type="button" className="btn-primary btn-lg w-full" onClick={preview} disabled={busy} data-testid="try-on">
              {tryOnLabel}
            </button>
          </div>
        )}
      </section>

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
      {suit.warningNote && <p className="text-[13px] leading-[1.4] text-[var(--meta)]">{suit.warningNote}</p>}
      <button type="button" ref={whyTrigger} className="btn-ghost h-11 w-fit" onClick={() => setWhy(true)}>
        Why this verdict
      </button>
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(`${product.brand} ${product.name}`)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 items-center text-[15px] font-semibold text-[var(--brand)]"
      >
        Search this product
      </a>

      {!scan && ready && (
        <Link href="/scan" className="btn-secondary w-fit">
          Scan to check it
        </Link>
      )}

      {!makeup && (
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
      )}

      {makeup && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-ghost h-11"
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
      )}

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

function BeforeAfter({ before, after, makeup }: { before: string; after: string; makeup: boolean }) {
  const [split, setSplit] = useState(56);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <figure className="overflow-hidden rounded-[12px] bg-[var(--pack)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={before} alt="Before" className="aspect-[3/4] w-full object-cover" />
          <figcaption className="px-2 py-2 text-[12px] font-semibold">Before</figcaption>
        </figure>
        <figure className="overflow-hidden rounded-[12px] bg-[var(--pack)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={after} alt="YouCam try-on result" className="aspect-[3/4] w-full object-cover" />
          <figcaption className="px-2 py-2 text-[12px] font-semibold">{makeup ? "YouCam makeup" : "YouCam simulation"}</figcaption>
        </figure>
      </div>
      <figure>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-[var(--pack)] select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={before} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={after}
            alt=""
            className={cn("absolute inset-0 h-full w-full object-cover")}
            style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
          />
          <div className="absolute inset-y-0 z-10 w-0.5 bg-white shadow-[var(--sh-2)]" style={{ left: `${split}%` }}>
            <span className="absolute top-1/2 -left-[18px] grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-[11px] font-semibold shadow-[var(--sh-2)]">
              ||
            </span>
          </div>
          <span className="absolute top-3 left-3 rounded-full bg-black/50 px-2 py-1 text-[12px] text-white">Before</span>
          <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-1 text-[12px] text-white">Preview</span>
        </div>
        <label className="mt-3 flex flex-col gap-2 text-[13px]">Compare before and preview
          <input type="range" min="12" max="88" value={split} onChange={(event) => setSplit(Number(event.target.value))} aria-label="Before and preview split" className="w-full" />
        </label>
      </figure>
    </div>
  );
}
