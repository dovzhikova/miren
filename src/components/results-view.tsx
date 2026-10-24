"use client";

import Link from "next/link";
import { useState } from "react";
import { HabitsSection } from "@/components/habits-panel";
import { WhySheet } from "@/components/why-sheet";
import { cn } from "@/lib/utils";
import { formatPrice, routineRoleLabel } from "@/lib/catalog";
import { forYouProducts, makeupForYou } from "@/lib/recommend";
import { suitProduct } from "@/lib/suitability";
import { ProductPhoto } from "@/components/product-photo";
import { VerdictBadge } from "@/components/verdict-badge";
import type { ConcernId, ConcernScore, Scan } from "@/lib/types";
import { useGlow } from "@/lib/store";

const HOTSPOT: Partial<Record<ConcernId, { x: number; y: number }>> = {
  wrinkle: { x: 50, y: 22 },
  pore: { x: 68, y: 58 },
  acne: { x: 40, y: 72 },
  texture: { x: 30, y: 64 },
  redness: { x: 72, y: 66 },
  oiliness: { x: 54, y: 48 },
  moisture: { x: 28, y: 50 },
  radiance: { x: 50, y: 36 },
  dark_circle: { x: 38, y: 42 },
  eye_bag: { x: 64, y: 44 },
  tear_trough: { x: 40, y: 50 },
  age_spot: { x: 66, y: 30 },
  firmness: { x: 50, y: 84 },
};

const ZONES = [
  { label: "Forehead", x: 50, y: 18 },
  { label: "Eyes", x: 50, y: 40 },
  { label: "Cheeks", x: 50, y: 62 },
  { label: "Jaw", x: 50, y: 86 },
];

const TABS = [
  { id: "skin", label: "Skin" },
  { id: "for-you", label: "For you" },
  { id: "makeup", label: "Makeup" },
  { id: "habits", label: "Habits" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ResultsView() {
  const { ready, state, setBaseline } = useGlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [concern, setConcern] = useState<ConcernScore | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [hotspot, setHotspot] = useState<ConcernId | null>(null);
  const [tab, setTab] = useState<TabId>("skin");

  if (!ready) return <div className="h-80 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;

  const scan = state.scans.find((item) => item.id === selectedId) ?? state.scans[0];
  if (!scan) {
    return (
      <div className="flex flex-col gap-3 py-8">
        <h1 className="font-display text-[28px] font-bold">No scan yet</h1>
        <p className="text-[var(--ink-2)]">Take a photo or use the sample face. The shelf has nothing to match until then.</p>
        <Link href="/scan" className="btn-primary w-full">
          Start a scan
        </Link>
      </div>
    );
  }

  const removed = [...new Set(scan.filtered.map((item) => (item.reason === "mole" ? "a mole" : "eyelid shape")))];
  const focus = scan.concerns.filter((item) => item.uiScore < 75).slice(0, 4);
  const focusIds = new Set((focus.length ? focus : scan.concerns.slice(0, 3)).map((item) => item.id));
  const isBaseline = state.baselineId === scan.id;
  const forYou = forYouProducts(scan);
  const makeup = makeupForYou(scan);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[12px] font-semibold text-[var(--ink)]">
          {scan.mode === "mock" ? "Demo scores" : "Powered by YouCam Skin AI"}
        </span>
        {scan.mode === "live" && <span className="text-[12px] font-medium text-[var(--meta)]">AI Skin Analysis v2.1</span>}
      </div>

      <div role="tablist" aria-label="Scan results" className="flex gap-1 overflow-x-auto rounded-[12px] bg-[var(--surface-2)] p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            className={cn(
              "h-11 min-w-[5.5rem] flex-1 rounded-[8px] px-3 text-[15px] font-semibold",
              tab === item.id ? "bg-[var(--brand)] text-white" : "text-[var(--ink)]",
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {state.scans.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {state.scans.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold ${item.id === scan.id ? "bg-[var(--brand)] text-white" : "bg-[var(--surface-2)] text-[var(--ink)]"}`}
              onClick={() => setSelectedId(item.id)}
            >
              {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </button>
          ))}
        </div>
      )}

      {tab === "skin" && (
        <div role="tabpanel" id="panel-skin" aria-labelledby="tab-skin" className="flex flex-col gap-6">
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <AnnotatedFace scan={scan} focusIds={focusIds} hotspot={hotspot} onHotspot={setHotspot} />
            <div className="flex flex-col gap-4">
              <div>
                <p className="micro">{scan.mode === "mock" ? "Demo data · generated example scores" : "YouCam AI Skin Analysis v2.1"}</p>
                <p className={cn("num mt-2 text-[64px] leading-none font-semibold", scoreToneClass(scan.overall))} aria-live="polite">
                  {scan.overall}
                  <span className="text-[22px] font-semibold text-[var(--meta)]">/100</span>
                </p>
                <h1 className="mt-2 font-display text-[22px] leading-[1.25] font-semibold">{summaryLine(scan)}</h1>
                <p className="mt-2 text-[14px] text-[var(--ink-2)]">
                  {scan.skinType ? `${scan.skinType} skin. ` : ""}
                  {scan.skinAge != null ? `Skin age estimate ${scan.skinAge}, a cosmetic read. ` : ""}
                  Raw overall {scan.overallRaw ?? "unavailable"}.
                </p>
                <p className="mt-3 text-[13px] leading-snug text-[var(--ink-2)]">Cosmetic read, not a diagnosis. Higher means healthier-looking in this photo.</p>
              </div>
              <ConcernChart concerns={scan.concerns} onSelect={setConcern} focusIds={focusIds} />
            </div>
          </div>

          <p className="rounded-[16px] bg-[var(--surface-2)] px-4 py-3 text-[13px] leading-[1.4] text-[var(--ink-2)]">
            Moles and eyelid shape stay off the shelf. A cream here cannot treat either one.
            {removed.length ? ` This result included ${removed.join(" and ")}. Removed.` : " This result did not include them."}
          </p>

          <button type="button" className="btn-ghost h-11 text-left" onClick={() => setHowOpen(true)}>
            How is this calculated?
          </button>

          {isBaseline ? (
            <p className="text-[13px] text-[var(--meta)]">This scan is the baseline later checks are measured against.</p>
          ) : (
            <button type="button" className="btn-ghost h-11 text-left" onClick={() => setBaseline(scan.id)}>
              Use as the new baseline
            </button>
          )}
        </div>
      )}

      {tab === "for-you" && (
        <div role="tabpanel" id="panel-for-you" aria-labelledby="tab-for-you" className="flex flex-col gap-3">
          <div>
            <h2 className="font-display text-[22px] leading-[1.2] font-bold">A short routine</h2>
            <p className="mt-2 text-[14px] leading-[1.4] text-[var(--ink-2)]">
              {forYou.length} products for the scores under 75. One of each step, suits ahead of patch-test.
            </p>
          </div>
          {forYou.map((product) => {
            const suit = suitProduct(product, scan);
            return (
              <Link key={product.slug} href={`/shop/${product.slug}`} className="flex items-center gap-4 border-b border-[var(--line)] py-3">
                <ProductPhoto product={product} />
                <span className="min-w-0">
                  <VerdictBadge verdict={suit.verdict} />
                  <span className="mt-1 block text-[16px] leading-snug font-semibold">{product.name}</span>
                  <span className="block text-[13px] text-[var(--ink-2)]">
                    {product.brand} · {routineRoleLabel(product.routineRole)} · {formatPrice(product.price)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {tab === "makeup" && (
        <div role="tabpanel" id="panel-makeup" aria-labelledby="tab-makeup" className="flex flex-col gap-3">
          <div>
            <span className="inline-flex rounded-full border border-[var(--line)] px-3 py-1 text-[12px] font-semibold">Powered by YouCam Makeup VTO</span>
            <h2 className="mt-3 font-display text-[22px] leading-[1.2] font-bold">Colour that fits</h2>
            <p className="mt-2 text-[14px] leading-[1.4] text-[var(--ink-2)]">
              {makeup.length ? `${makeup.length} shades for the low scores. Try-on uses this scan photo.` : "No makeup match for these scores."}
            </p>
          </div>
          {makeup.map((product) => {
            const suit = suitProduct(product, scan);
            return (
              <Link key={product.slug} href={`/shop/${product.slug}?try=1`} className="flex items-center gap-4 border-b border-[var(--line)] py-3">
                <ProductPhoto product={product} />
                <span className="min-w-0">
                  <VerdictBadge verdict={suit.verdict} />
                  <span className="mt-1 block text-[16px] leading-snug font-semibold">{product.name}</span>
                  <span className="block text-[13px] text-[var(--ink-2)]">
                    {product.brand} · {product.category} · {formatPrice(product.price)}
                  </span>
                  <span className="mt-2 inline-flex h-9 items-center rounded-[8px] bg-[var(--brand)] px-3 text-[13px] font-semibold text-white">Try this on</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {tab === "habits" && (
        <div role="tabpanel" id="panel-habits" aria-labelledby="tab-habits">
          <HabitsSection scan={scan} />
        </div>
      )}

      <WhySheet open={Boolean(concern)} title={concern?.label ?? "Concern"} onClose={() => setConcern(null)}>
        {concern && (
          <>
            <p>{concern.explanation}</p>
            <p>{concern.direction} UI score {concern.uiScore}. Raw score {concern.rawScore ?? "unavailable"}. Only measured raw scores enter comparisons.</p>
            <p>Products for the low scores are in For you, a short list rather than one shelf per concern.</p>
          </>
        )}
      </WhySheet>

      <WhySheet open={howOpen} title="How is this calculated?" onClose={() => setHowOpen(false)}>
        <p>YouCam Skin Analysis reads the photo and returns a score per concern. Higher means healthier-looking. The large number is their adjusted UI score.</p>
        <p>GlowCheck hides moles and eyelid shape, then matches products to the scores that are actually low. The follow-up compares the raw score, which YouCam says to keep over time.</p>
        <p>This is a cosmetic read, not a diagnosis.</p>
      </WhySheet>
    </div>
  );
}

function AnnotatedFace({
  scan,
  focusIds,
  hotspot,
  onHotspot,
}: {
  scan: Scan;
  focusIds: Set<ConcernId>;
  hotspot: ConcernId | null;
  onHotspot: (id: ConcernId | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-[var(--pack)]">
    <div className="relative">
      {scan.previewDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={scan.previewDataUrl} alt="Annotated face from this scan" className="aspect-[4/5] max-h-[520px] w-full object-cover object-top" />
      ) : (
        <div className="aspect-[4/5] w-full" />
      )}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <ellipse cx="50" cy="24" rx="24" ry="12" fill="none" stroke="white" strokeWidth="0.7" />
        <ellipse cx="37" cy="50" rx="11" ry="7" fill="none" stroke="white" strokeWidth="0.7" />
        <ellipse cx="63" cy="50" rx="11" ry="7" fill="none" stroke="white" strokeWidth="0.7" />
        <ellipse cx="34" cy="74" rx="13" ry="12" fill="none" stroke="white" strokeWidth="0.7" />
        <ellipse cx="66" cy="74" rx="13" ry="12" fill="none" stroke="white" strokeWidth="0.7" />
        <ellipse cx="50" cy="104" rx="18" ry="10" fill="none" stroke="white" strokeWidth="0.7" />
      </svg>
      <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold shadow-[var(--sh-1)]">
        Skin score <span className="num">{scan.overall}</span>
      </span>
      {scan.concerns.map((item) => {
        const spot = HOTSPOT[item.id];
        if (!spot) return null;
        const labeled = focusIds.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            aria-label={`${item.label} ${item.uiScore}`}
            onClick={() => onHotspot(hotspot === item.id ? null : item.id)}
          >
            <span className="size-2.5 rounded-full bg-white shadow-[0_0_0_4px_rgba(26,26,26,0.55)]" />
            {(labeled || hotspot === item.id) && (
              <span className="absolute top-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--ink)] px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-white">
                {item.label} {item.uiScore}
              </span>
            )}
          </button>
        );
      })}
    </div>
    <p className="flex flex-wrap gap-2 bg-white px-3 py-2 text-[12px] font-semibold text-[var(--ink)]">
      {ZONES.map((zone) => (
        <span key={zone.label} className="rounded-full bg-[var(--surface-2)] px-2 py-1">{zone.label}</span>
      ))}
    </p>
    </div>
  );
}

function ConcernChart({
  concerns,
  onSelect,
  focusIds,
}: {
  concerns: Scan["concerns"];
  onSelect: (concern: ConcernScore) => void;
  focusIds: Set<ConcernId>;
}) {
  return (
    <section className="rounded-[16px] border border-[var(--line)] bg-white p-4">
      <h2 className="text-[16px] font-semibold">All concern scores</h2>
      <p className="mt-1 text-[12px] text-[var(--meta)]">75 and up is steady. Under 50 is a priority on this photo.</p>
      <ul className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {concerns.map((item) => (
          <li key={item.id}>
            <button type="button" className="w-full text-left" onClick={() => onSelect(item)}>
              <span className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-medium text-[var(--ink)]">
                  {item.label}
                  {focusIds.has(item.id) ? <span className="ml-1 text-[11px] font-semibold text-[var(--meta)]">Focus</span> : null}
                </span>
                <span className={cn("num font-semibold", scoreToneClass(item.uiScore))}>{item.uiScore}</span>
              </span>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[var(--surface-2)]" role="img" aria-label={`${item.label} ${item.uiScore} out of 100`}>
                <span className={cn("block h-full rounded-full", barClass(item.uiScore))} style={{ width: `${Math.max(4, Math.min(100, item.uiScore))}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function scoreToneClass(score: number): string {
  if (score >= 75) return "text-[var(--suits)]";
  if (score >= 50) return "text-[var(--patch)]";
  return "text-[var(--skip)]";
}

function barClass(score: number): string {
  if (score >= 75) return "bg-[var(--suits)]";
  if (score >= 50) return "bg-[var(--patch)]";
  return "bg-[var(--skip)]";
}

function summaryLine(scan: Scan): string {
  const watch = scan.concerns.filter((item) => item.uiScore < 75).slice(0, 2);
  if (!watch.length) return "Scores look steady across this photo.";
  const moisture = scan.concerns.find((item) => item.id === "moisture");
  const lead = moisture && moisture.uiScore >= 75 ? "Good barrier" : "Mixed read";
  return `${lead}, watch ${watch.map((item) => item.label.toLowerCase()).join(" & ")}.`;
}
