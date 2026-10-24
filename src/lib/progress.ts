import { getProduct } from "@/lib/catalog";
import { explainConcern } from "@/lib/concerns";
import { isDemoScan } from "@/lib/scan-kind";
import type { AppState, ConcernDelta, ConcernId, Product, ProgressCall, Scan } from "@/lib/types";

const MOVE = 3;
export const OBSERVATION_DAYS = 14;
const DAY = 86_400_000;

export function latestScan(state: AppState): Scan | null {
  return state.scans[0] ?? null;
}

export function baselineScan(state: AppState): Scan | null {
  if (state.baselineId) return state.scans.find((scan) => scan.id === state.baselineId) ?? null;
  return state.scans.at(-1) ?? null;
}

export function comparisonIssue(baseline: Scan, latest: Scan): string | null {
  if (isDemoScan(baseline) !== isDemoScan(latest)) return "Demo and personal scans cannot be compared.";
  if (!isDemoScan(baseline) && (baseline.engine !== latest.engine || !baseline.profile || baseline.profile !== latest.profile)) {
    return "These scans use different or unknown analysis profiles. Take a new baseline with the same camera and framing.";
  }
  const before = Date.parse(baseline.createdAt);
  const after = Date.parse(latest.createdAt);
  if (!Number.isFinite(before) || !Number.isFinite(after) || after < before) return "The scan dates cannot be compared.";
  return null;
}

export function compareScans(baseline: Scan, latest: Scan): ConcernDelta[] {
  if (comparisonIssue(baseline, latest)) return [];
  return baseline.concerns.flatMap((item) => {
    const next = latest.concerns.find((concern) => concern.id === item.id);
    if (item.rawScore == null || next?.rawScore == null) return [];
    return [{
      id: item.id,
      label: item.label,
      baselineRaw: item.rawScore,
      latestRaw: next.rawScore,
      delta: Math.round((next.rawScore - item.rawScore) * 10) / 10,
      baselineUi: item.uiScore,
      latestUi: next.uiScore,
    }];
  });
}

export function productProgress(product: Product, baseline: Scan, latest: Scan, startedAt = baseline.createdAt): ProgressCall {
  const result = (verdict: ProgressCall["verdict"], title: string, summary: string, delta: number | null = null): ProgressCall => ({ productId: product.slug, verdict, title, summary, delta });
  if (!product.tracksSkin || product.routineRole === "makeup") {
    return result("untracked", "Colour, not a skin trial", "Choose this for its shade and finish. Skin-score changes do not measure makeup performance.");
  }
  if (baseline.id === latest.id) return result("observe", "Baseline saved", "A second comparable scan will show changes. One photo cannot establish a trend.");
  const issue = comparisonIssue(baseline, latest);
  if (issue) return result("observe", "Comparison unavailable", issue);
  const days = (Date.parse(latest.createdAt) - Math.max(Date.parse(baseline.createdAt), Date.parse(startedAt))) / DAY;
  if (!Number.isFinite(days) || days < OBSERVATION_DAYS) {
    return result("observe", "More observations needed", "It has been under two weeks of tracking. Keep capture conditions consistent; a short-term score change does not establish product effectiveness.");
  }
  const deltas = compareScans(baseline, latest).filter((row) => product.concerns.includes(row.id));
  if (!deltas.length) return result("observe", "Raw scores unavailable", "These scans do not share a measured raw score for the concerns listed on this product.");
  const delta = Math.round(deltas.reduce((sum, row) => sum + row.delta, 0) / deltas.length * 10) / 10;
  const caveat = " Lighting, routine changes, and other factors can affect scores. This does not establish what caused the change.";
  if (delta >= MOVE) return result("improved", "Scores improved", `Available concern scores rose by ${delta} raw points.${caveat}`, delta);
  if (delta <= -MOVE) return result("declined", "Scores declined", `Available concern scores fell by ${Math.abs(delta)} raw points.${caveat}`, delta);
  return result("observe", "No clear trend yet", `Available concern scores changed by ${delta} raw points. Three points is a demo display threshold, not a validated efficacy threshold.${caveat}`, delta);
}

export function routineCalls(state: AppState): ProgressCall[] {
  const latest = latestScan(state);
  if (!latest) return [];
  return state.routine.flatMap((item) => {
    const product = getProduct(item.productId);
    if (!product) return [];
    const baseline = state.scans.find((scan) => scan.id === item.baselineScanId);
    if (!baseline) return [{ productId: product.slug, verdict: "observe" as const, title: "Starting scan unavailable", summary: "This product's original baseline is missing. Remove it and start a new trial with a fresh scan.", delta: null }];
    return [productProgress(product, baseline, latest, item.startedAt)];
  });
}

const SAMPLE_BOOST = new Set<ConcernId>(["wrinkle", "pore", "moisture", "texture", "redness"]);
const SAMPLE_DROP = new Set<ConcernId>(["acne"]);

export function buildSampleFollowUp(baseline: Scan): Scan {
  if (!isDemoScan(baseline)) throw new Error("Open Demo data to generate an example follow-up.");
  const concerns = baseline.concerns.map((item) => {
    const delta = SAMPLE_BOOST.has(item.id) ? 8 : SAMPLE_DROP.has(item.id) ? -6 : 1;
    const uiScore = Math.round(Math.min(100, Math.max(1, item.uiScore + delta)));
    const rawScore = item.rawScore == null ? null : Math.round(Math.min(100, Math.max(1, item.rawScore + delta)) * 10) / 10;
    return { ...item, uiScore, rawScore, explanation: explainConcern(item.id, uiScore), maskUrl: undefined };
  });
  const raw = concerns.flatMap((item) => item.rawScore == null ? [] : [item.rawScore]);
  return {
    ...baseline,
    id: crypto.randomUUID(),
    createdAt: new Date(Date.parse(baseline.createdAt) + 21 * DAY).toISOString(),
    source: "sample",
    mode: "mock",
    auth: "none",
    concerns,
    overall: concerns.length ? Math.round(concerns.reduce((sum, item) => sum + item.uiScore, 0) / concerns.length) : 0,
    overallRaw: raw.length === concerns.length && raw.length ? Math.round(raw.reduce((sum, value) => sum + value, 0) / raw.length * 10) / 10 : null,
    filtered: [],
    engine: "sample-follow-up",
  };
}
