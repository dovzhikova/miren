"use client";

import Link from "next/link";
import { useState } from "react";
import { HabitsSection } from "@/components/habits-panel";
import { WhySheet } from "@/components/why-sheet";
import { cn } from "@/lib/utils";
import { productsForConcern } from "@/lib/catalog";
import type { ConcernId, ConcernScore, Scan } from "@/lib/types";
import { useGlow } from "@/lib/store";

const HOTSPOT: Partial<Record<ConcernId, { x: number; y: number }>> = {
  wrinkle: { x: 50, y: 26 },
  pore: { x: 68, y: 58 },
  acne: { x: 40, y: 76 },
  texture: { x: 30, y: 62 },
  redness: { x: 72, y: 66 },
  oiliness: { x: 54, y: 46 },
  moisture: { x: 28, y: 48 },
  radiance: { x: 50, y: 38 },
  dark_circle: { x: 36, y: 44 },
  eye_bag: { x: 66, y: 48 },
  tear_trough: { x: 38, y: 52 },
  age_spot: { x: 64, y: 32 },
  firmness: { x: 50, y: 84 },
};

export function ResultsView() {
  const { ready, state, setBaseline } = useGlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [concern, setConcern] = useState<ConcernScore | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [hotspot, setHotspot] = useState<ConcernId | null>(null);

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
  const focus = scan.concerns.filter((item) => item.uiScore < 75).slice(0, 3);
  const focusIds = new Set((focus.length ? focus : scan.concerns.slice(0, 3)).map((item) => item.id));
  const isBaseline = state.baselineId === scan.id;
  const helps = concern ? productsForConcern(concern.id).slice(0, 3) : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="relative">
        <div className="relative overflow-hidden rounded-[12px] bg-[var(--surface-2)]">
          {scan.previewDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scan.previewDataUrl} alt="Face used for this scan" className="aspect-[4/5] w-full object-cover" />
          ) : (
            <div className="aspect-[4/5] w-full" />
          )}
          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold shadow-[var(--sh-1)]">
            Skin score <span className="num">{scan.overall}</span>
          </span>
          {[...focusIds].map((id) => {
            const spot = HOTSPOT[id];
            const item = scan.concerns.find((row) => row.id === id);
            if (!spot || !item) return null;
            return (
              <button
                key={id}
                type="button"
                className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center"
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                aria-label={item.label}
                onClick={() => setHotspot(hotspot === id ? null : id)}
              >
                <span className="size-2 rounded-full bg-white shadow-[0_0_0_4px_rgba(26,26,26,0.45)]" />
                {hotspot === id && (
                  <span className="absolute top-8 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-1 text-[12px] font-semibold whitespace-nowrap shadow-[var(--sh-1)]">
                    {item.label} {item.uiScore}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="micro">{scan.mode === "mock" ? "Sample fixture · YouCam Skin Analysis v2.1" : "YouCam AI Skin Analysis v2.1"}</p>
        <p className={cn("num mt-2 text-[64px] leading-none font-semibold", scoreToneClass(scan.overall))} aria-live="polite">
          {scan.overall}
          <span className="text-[22px] font-semibold text-[var(--meta)]">/100</span>
        </p>
        <h1 className="mt-2 font-display text-[17px] leading-[1.3] font-semibold">{summaryLine(scan)}</h1>
        <p className="mt-2 text-[13px] text-[var(--meta)]">
          {scan.skinType ? `${scan.skinType} skin. ` : ""}
          {scan.skinAge != null ? `Skin age estimate ${scan.skinAge}, a cosmetic read. ` : ""}
          Raw overall {scan.overallRaw}.
        </p>
      </div>

      <p className="rounded-[16px] bg-[var(--surface-2)] px-4 py-3 text-[13px] leading-[1.4] text-[var(--ink-2)]">
        Moles and eyelid shape stay off the shelf. A cream here cannot treat either one.
        {removed.length ? ` This result included ${removed.join(" and ")}. Removed.` : " This result did not include them."}
      </p>

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

      <section className="flex flex-col gap-3">
        <p className="micro">Markers</p>
        <ScoreSpread concerns={scan.concerns} />
        <div className="grid grid-cols-2 gap-2">
          {scan.concerns.map((item) => (
            <button
              key={item.id}
              type="button"
              className="rounded-[12px] bg-[var(--surface-2)] px-3 py-3 text-left"
              onClick={() => setConcern(item)}
            >
              <span className="block text-[13px] leading-snug font-medium text-[var(--ink)]">{item.label}</span>
              <span className={cn("num mt-1 block text-[28px] leading-none font-semibold", scoreToneClass(item.uiScore))}>{item.uiScore}</span>
              <span className="mt-1 block text-[12px] text-[var(--meta)]">{item.uiScore >= 75 ? "Steady" : item.uiScore >= 50 ? "Watch" : "Priority"}</span>
              {focusIds.has(item.id) && <span className="micro mt-1 block">Focus</span>}
            </button>
          ))}
        </div>
      </section>

      <HabitsSection scan={scan} />

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

      <div className="sticky-bar">
        <Link href="/shop" className="btn-primary w-full">
          Find products that suit me
        </Link>
      </div>

      <WhySheet open={Boolean(concern)} title={concern?.label ?? "Concern"} onClose={() => setConcern(null)}>
        {concern && (
          <>
            <p>{concern.explanation}</p>
            <p>{concern.direction} UI score {concern.uiScore}. Raw score {concern.rawScore}, kept for the follow-up.</p>
            {helps.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {helps.flatMap((product) =>
                  product.ingredients.split(",").slice(0, 2).map((part) => (
                    <span key={`${product.slug}-${part}`} className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[13px] font-medium text-[var(--ink-2)]">
                      {part.trim()}
                    </span>
                  )),
                )}
              </div>
            )}
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

function scoreToneClass(score: number): string {
  if (score >= 75) return "text-[var(--suits)]";
  if (score >= 50) return "text-[var(--patch)]";
  return "text-[var(--skip)]";
}

function ScoreSpread({ concerns }: { concerns: Scan["concerns"] }) {
  const steady = concerns.filter((item) => item.uiScore >= 75).length;
  const watch = concerns.filter((item) => item.uiScore >= 50 && item.uiScore < 75).length;
  const priority = concerns.filter((item) => item.uiScore < 50).length;
  const total = concerns.length || 1;
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-white p-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="bg-[var(--suits)]" style={{ width: `${(steady / total) * 100}%` }} />
        <div className="bg-[var(--patch)]" style={{ width: `${(watch / total) * 100}%` }} />
        <div className="bg-[var(--skip)]" style={{ width: `${(priority / total) * 100}%` }} />
      </div>
      <p className="num mt-2 text-[12px] text-[var(--ink-2)]">
        Steady {steady} · Watch {watch} · Priority {priority}
      </p>
    </div>
  );
}

function summaryLine(scan: Scan): string {
  const watch = scan.concerns.filter((item) => item.uiScore < 75).slice(0, 2);
  if (!watch.length) return "Scores look steady across this photo.";
  const moisture = scan.concerns.find((item) => item.id === "moisture");
  const lead = moisture && moisture.uiScore >= 75 ? "Good barrier" : "Mixed read";
  return `${lead}, watch ${watch.map((item) => item.label.toLowerCase()).join(" & ")}.`;
}
