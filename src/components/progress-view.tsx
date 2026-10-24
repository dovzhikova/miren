"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { HabitLog } from "@/components/habits-panel";
import { ProductPhoto } from "@/components/product-photo";
import { VerdictBadge } from "@/components/verdict-badge";
import { getProduct } from "@/lib/catalog";
import { baselineScan, buildSampleFollowUp, compareScans, comparisonIssue, latestScan, routineCalls } from "@/lib/progress";
import { addScan, removeFromRoutine, useGlow } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ProgressView() {
  const { ready, state, workspace, setWorkspace } = useGlow();
  const [tab, setTab] = useState<"history" | "compare">("compare");

  if (!ready) return <div className="h-80 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;

  const baseline = baselineScan(state);
  const latest = latestScan(state);
  if (!baseline || !latest) {
    return (
      <div className="flex flex-col gap-3 py-8">
        <p className="micro">Is it working?</p>
        <h1 className="font-display text-[28px] font-bold">No baseline yet</h1>
        <p className="text-[var(--ink-2)]">The tracker needs a first scan. Later photos are compared on YouCam&apos;s raw score.</p>
        <Link href="/scan" className="btn-primary w-full">
          Take the first scan
        </Link>
      </div>
    );
  }

  const same = baseline.id === latest.id;
  const issue = same ? null : comparisonIssue(baseline, latest);
  const deltas = same ? [] : compareScans(baseline, latest);
  const calls = routineCalls(state);
  const lead = calls.map((call) => getProduct(call.productId)?.name).find(Boolean);
  const history = [...state.scans].reverse();
  const trend = history.filter((scan) => !comparisonIssue(scan, latest)).flatMap((scan) => scan.overallRaw == null ? [] : [scan.overallRaw]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="micro">Is it working?</p>
        {workspace === "mock" && <p className="mb-2 text-[13px] font-semibold">Demo data: all changes are generated examples.</p>}
        <h1 className="mt-1 font-display text-[28px] leading-[1.15] font-bold">Your routine over time</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[12px] bg-[var(--surface-2)] px-4 py-3">
          <p className="micro">Baseline</p>
          <p className="num mt-1 text-[36px] leading-none font-semibold">{baseline.overall}</p>
        </div>
        <div className="rounded-[12px] bg-[var(--surface-2)] px-4 py-3">
          <p className="micro">Latest</p>
          <p className="num mt-1 text-[36px] leading-none font-semibold">{same ? "Pending" : latest.overall}</p>
        </div>
      </div>

      <section className="rounded-[12px] bg-[var(--surface-warm)] p-4">
        <p className="text-[15px] font-semibold">
          {lead ? `Tracking ${lead}.` : "Track changes between scans."}
        </p>
        <p className="mt-2 text-[13px] text-[var(--ink-2)]">
          {same
            ? "Use the same camera, framing, and lighting for your next scan. Scores alone cannot establish whether a product worked."
            : `Baseline ${formatDay(baseline.createdAt)} to latest ${formatDay(latest.createdAt)}. Changes below use measured raw scores.`}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {workspace === "mock" ? (
            <>
              <p className="text-[13px] font-semibold">Demo data only. The example below generates a follow-up dated 21 days after the baseline.</p>
              <button type="button" className="btn-primary w-full" data-testid="sample-followup" onClick={() => addScan(buildSampleFollowUp(baseline))}>Generate demo follow-up</button>
            </>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => setWorkspace("mock")}>Explore separate demo data</button>
          )}
          <Link href="/scan" className="btn-ghost grid h-11 place-items-center">{workspace === "mock" ? "Take another demo scan" : "Take a follow-up scan"}</Link>
        </div>
      </section>

      <div className="flex rounded-[8px] bg-[var(--surface-2)] p-1" aria-label="Routine view">
        {(["history", "compare"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={cn("h-9 flex-1 rounded-[6px] text-[13px] font-semibold capitalize", tab === item ? "bg-white text-[var(--ink)]" : "text-[var(--ink-2)]")}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "history" ? (
        <ul className="flex flex-col gap-3">
          {history.map((scan) => (
            <li key={scan.id} className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <p className="text-[15px] font-semibold">{formatDay(scan.createdAt)}</p>
                <p className="text-[12px] text-[var(--meta)]">{scan.id === baseline.id ? "Baseline" : scan.id === latest.id ? "Latest" : "Earlier scan"}</p>
              </div>
              <p className="num text-[22px] font-bold">{scan.overall}</p>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <PhotoTile label="Before" date={baseline.createdAt} src={baseline.previewDataUrl} />
            <PhotoTile label="After" date={latest.createdAt} src={same ? undefined : latest.previewDataUrl} pending={same} />
          </div>
          {same ? (
            <p className="text-[13px] text-[var(--meta)]">One scan is a starting point. Take another comparable photo to see changes.</p>
          ) : issue ? (
            <p role="status" className="text-[13px]">{issue}</p>
          ) : deltas.length === 0 ? (
            <p role="status" className="text-[13px]">No shared measured raw scores are available for comparison.</p>
          ) : (
            <ul className="flex flex-col">
              {deltas.map((delta) => {
                const rawDelta = delta.delta;
                const tone = rawDelta > 0 ? "suits" : rawDelta < 0 ? "skip" : "neutral";
                return (
                  <li key={delta.id} className="flex items-center gap-3 border-b border-[var(--line)] py-3">
                    <span className="w-[92px] text-[15px] font-semibold">{delta.label}</span>
                    <span className="num flex-1 text-[13px] text-[var(--ink-2)]">
                      {delta.baselineRaw.toFixed(1)} to {delta.latestRaw.toFixed(1)} raw
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[12px] font-semibold",
                        tone === "suits" && "bg-[var(--suits-bg)] text-[var(--suits)]",
                        tone === "skip" && "bg-[var(--skip-bg)] text-[var(--skip)]",
                        tone === "neutral" && "bg-[var(--surface-2)] text-[var(--meta)]",
                      )}
                    >
                      {rawDelta > 0 ? `▲ +${rawDelta}` : rawDelta < 0 ? `▼ ${rawDelta}` : "No change"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <HabitLog scan={baseline} />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] font-bold">Products on trial</h2>
        {calls.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-2)]">Start tracking a product from the cart. Its latest scan becomes its starting point.</p>
        ) : (
          calls.map((call) => {
            const product = getProduct(call.productId);
            const trial = state.routine.find((item) => item.productId === call.productId);
            if (!product) return null;
            return (
              <article key={call.productId} className="rounded-[12px] border border-[var(--line)] p-4">
                <div className="flex gap-3">
                  <div className="grid h-[88px] w-[72px] place-items-center overflow-hidden rounded-[12px] bg-[var(--stage)]">
                    <ProductPhoto product={product} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold">{product.name}</p>
                    <p className="text-[13px] text-[var(--meta)]">{product.brand}</p>
                    {trial && <p className="text-[12px] text-[var(--meta)]">Tracking since {formatDay(trial.startedAt)}</p>}
                    <div className="mt-2">
                      <VerdictBadge verdict={call.verdict} />
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[15px] font-semibold">{call.title}</p>
                <p className="mt-1 text-[13px] text-[var(--ink-2)]">{call.summary}</p>
                <div className="mt-3 flex gap-2">
                  {call.verdict === "declined" ? (
                    <Link href="/shop" className="btn-secondary">
                      See alternatives
                    </Link>
                  ) : (
                    <button type="button" className="btn-secondary" onClick={() => toast.success(`Staying with ${product.name}`)}>
                      Keep tracking
                    </button>
                  )}
                  <button type="button" className="btn-ghost px-3" onClick={() => removeFromRoutine(product.slug)}>
                    Remove
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      <Sparkline values={trend} />
    </div>
  );
}

function PhotoTile({ label, date, src, pending }: { label: string; date: string; src?: string; pending?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-[12px] bg-[var(--surface-2)]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${label} scan`} className="aspect-[3/4] w-full object-cover" />
      ) : (
        <div className="grid aspect-[3/4] place-items-center px-3 text-center text-[12px] text-[var(--meta)]">{pending ? "Waiting for the next photo" : "No photo saved"}</div>
      )}
      <figcaption className="px-2 py-2 text-[12px] text-[var(--meta)]">
        {label} · {formatDay(date)}
      </figcaption>
    </figure>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 360;
  const height = 72;
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const span = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * (width - 16) + 8;
    const y = height - 14 - ((value - min) / span) * (height - 28);
    return `${x},${y}`;
  });
  return (
    <section>
      <p className="micro mb-2">Measured raw overall</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[72px] w-full" role="img" aria-label="Measured raw overall across compatible scans">
        <polyline fill="none" stroke="#2C3539" strokeWidth="2" points={points.join(" ")} />
        {points.map((point) => {
          const [x, y] = point.split(",");
          return <circle key={point} cx={x} cy={y} r="3" fill="#2C3539" />;
        })}
      </svg>
    </section>
  );
}

function formatDay(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
