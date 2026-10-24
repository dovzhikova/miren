"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BookmarkIcon } from "lucide-react";
import { toast } from "sonner";
import { ProductPhoto } from "@/components/product-photo";
import { ScoreBar } from "@/components/score-bar";
import { VerdictBadge } from "@/components/verdict-badge";
import { WhySheet } from "@/components/why-sheet";
import { formatPrice, getProduct, ingredientPills } from "@/lib/catalog";
import { concernLabel } from "@/lib/concerns";
import { dataUrlToFile, requestTryOn, type TryOnResult } from "@/lib/photos";
import { latestScan } from "@/lib/progress";
import { addToCart, useGlow } from "@/lib/store";
import { suitProduct } from "@/lib/suitability";
import { cn } from "@/lib/utils";

export function ProductView({ slug }: { slug: string }) {
  const product = getProduct(slug);
  const { ready, state } = useGlow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [why, setWhy] = useState(false);

  if (!product) return null;
  if (!ready) return <div className="h-80 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;

  const scan = latestScan(state);
  const suit = suitProduct(product, scan);
  const inCart = state.cart.some((line) => line.productId === product.slug);
  const photo = scan?.previewDataUrl;
  const after = result?.resultUrl || photo;

  async function preview() {
    if (!photo || !product) return;
    const file = dataUrlToFile(photo);
    if (!file) {
      setError("The saved photo could not be read. Scan again.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setResult(await requestTryOn(file, product.slug));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The preview failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="micro">{product.brand}</p>
        <div className="mt-3 overflow-hidden rounded-[12px] bg-[var(--stage)]">
          <ProductPhoto product={product} className="mx-auto h-56 w-full object-contain" />
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
        <button type="button" className="btn-ghost mt-2 h-11" onClick={() => setWhy(true)}>
          Why this verdict
        </button>
      </div>

      {scan && product.concerns.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[22px] font-bold">Fit on your scores</h2>
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
            ? "Live mode calls YouCam AI Makeup Virtual Try-On."
            : "Live mode calls YouCam AI Skin Simulation. Oiliness is not sent: that slider adds shine."}
        </p>
        {!photo ? (
          <p className="rounded-[16px] bg-[var(--surface-2)] px-4 py-3 text-[13px]">Scan first. The preview uses the photo already on this device.</p>
        ) : (
          <>
            <button type="button" className="btn-secondary w-fit" onClick={preview} disabled={busy} data-testid="try-on">
              {busy ? "Asking YouCam…" : result ? "Refresh preview" : product.tryOn.label}
            </button>
            {result && after && (
              <BeforeAfter before={photo} after={after} live={Boolean(result.resultUrl)} makeup={false} />
            )}
          </>
        )}
        {error && <p className="text-[13px] text-[var(--skip)]">{error}</p>}
        <p className="text-[12px] text-[var(--meta)]">Preview by YouCam AR. Colour may vary on screen. Sample mode shows your photo, not a YouCam render, plus the payload live mode sends.</p>
        {result && (
          <pre className="overflow-x-auto rounded-[16px] bg-[var(--surface-2)] p-3 text-[11px] leading-relaxed">{JSON.stringify(result.preview, null, 2)}</pre>
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
          aria-label="Save look"
          onClick={() => {
            localStorage.setItem("glowcheck.look", product.slug);
            toast.success("Look saved on this device");
          }}
        >
          <BookmarkIcon className="size-5" />
        </button>
      </div>

      <WhySheet open={why} title={suit.title} onClose={() => setWhy(false)}>
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
  const frame = useRef<HTMLDivElement>(null);

  function move(clientX: number) {
    const bounds = frame.current?.getBoundingClientRect();
    if (!bounds) return;
    const next = ((clientX - bounds.left) / bounds.width) * 100;
    setSplit(Math.min(88, Math.max(12, next)));
  }

  return (
    <div
      ref={frame}
      className="relative aspect-[4/5] touch-none overflow-hidden rounded-[12px] bg-[var(--stage)] select-none"
      onPointerDown={(event) => {
        (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
        move(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.buttons) move(event.clientX);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt="Before" className="absolute inset-0 h-full w-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after}
        alt={live ? "YouCam try-on result" : "Sample preview"}
        className={cn("absolute inset-0 h-full w-full object-cover", makeup && "saturate-125")}
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
      />
      <div className="absolute inset-y-0 z-10 w-0.5 bg-white shadow-[var(--sh-2)]" style={{ left: `${split}%` }}>
        <span className="absolute top-1/2 -left-[18px] grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-[11px] font-semibold shadow-[var(--sh-2)]">
          ||
        </span>
      </div>
      <span className="absolute top-3 left-3 rounded-full bg-black/50 px-2 py-1 text-[12px] text-white">Before</span>
      <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-1 text-[12px] text-white">After</span>
    </div>
  );
}
