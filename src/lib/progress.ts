import { getProduct } from "@/lib/catalog";
import { explainConcern } from "@/lib/concerns";
import type { AppState, ConcernDelta, ConcernId, Product, ProgressCall, Scan } from "@/lib/types";

const MOVE = 3;
const EARLY_DAYS = 14;

export function latestScan(state: AppState): Scan | null {
  return state.scans[0] ?? null;
}

export function baselineScan(state: AppState): Scan | null {
  return state.scans.find((scan) => scan.id === state.baselineId) ?? state.scans.at(-1) ?? null;
}

export function compareScans(baseline: Scan, latest: Scan): ConcernDelta[] {
  return baseline.concerns.flatMap((item) => {
    const next = latest.concerns.find((concern) => concern.id === item.id);
    if (!next) return [];
    return [
      {
        id: item.id,
        label: item.label,
        baselineRaw: item.rawScore,
        latestRaw: next.rawScore,
        delta: Math.round((next.rawScore - item.rawScore) * 10) / 10,
        baselineUi: item.uiScore,
        latestUi: next.uiScore,
      },
    ];
  });
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function productProgress(product: Product, baseline: Scan, latest: Scan): ProgressCall {
  if (!product.tracksSkin) {
    return {
      productId: product.slug,
      verdict: "keep",
      title: "Keep if you like the shade",
      summary: "This is color. It will not show up as a better or worse skin score.",
      delta: null,
    };
  }

  if (baseline.id === latest.id) {
    return {
      productId: product.slug,
      verdict: "patch-test",
      title: "Patch-test",
      summary: "One scan is only a baseline. Check again in about two weeks before you keep or drop this.",
      delta: null,
    };
  }

  const deltas = product.concerns.flatMap((id) => {
    const before = baseline.concerns.find((item) => item.id === id);
    const after = latest.concerns.find((item) => item.id === id);
    if (!before || !after) return [];
    return [after.rawScore - before.rawScore];
  });
  const delta = average(deltas);
  const days = (Date.parse(latest.createdAt) - Date.parse(baseline.createdAt)) / 86_400_000;

  if (delta == null) {
    return {
      productId: product.slug,
      verdict: "patch-test",
      title: "Patch-test",
      summary: "The two scans don't share a score this product can be judged on.",
      delta: null,
    };
  }

  if (delta >= MOVE) {
    return {
      productId: product.slug,
      verdict: "keep",
      title: "Keep",
      summary: `The concerns this product targets rose by ${delta} raw points. Stay with it.`,
      delta,
    };
  }

  if (delta <= -MOVE) {
    return {
      productId: product.slug,
      verdict: "switch",
      title: "Switch",
      summary: `Those concerns fell by ${Math.abs(delta)} raw points. Stop this product and pick a different match.`,
      delta,
    };
  }

  if (Number.isFinite(days) && days < EARLY_DAYS) {
    return {
      productId: product.slug,
      verdict: "patch-test",
      title: "Patch-test",
      summary: `The change is only ${delta} raw points, and it has been under two weeks. Too early to keep or quit.`,
      delta,
    };
  }

  return {
    productId: product.slug,
    verdict: "patch-test",
    title: "Patch-test",
    summary: `After more than two weeks the scores only moved ${delta} raw points. One more scan, then switch if it stays flat.`,
    delta,
  };
}

export function routineCalls(state: AppState): ProgressCall[] {
  const latest = latestScan(state);
  if (!latest) return [];
  return state.routine.flatMap((item) => {
    const product = getProduct(item.productId);
    const baseline = state.scans.find((scan) => scan.id === item.baselineScanId) ?? baselineScan(state);
    if (!product || !baseline) return [];
    return [productProgress(product, baseline, latest)];
  });
}

const SAMPLE_BOOST = new Set<ConcernId>(["wrinkle", "pore", "moisture", "texture", "redness"]);
const SAMPLE_DROP = new Set<ConcernId>(["acne"]);

export function buildSampleFollowUp(baseline: Scan): Scan {
  const concerns = baseline.concerns.map((item) => {
    const delta = SAMPLE_BOOST.has(item.id) ? 8 : SAMPLE_DROP.has(item.id) ? -6 : 1;
    const uiScore = Math.round(Math.min(100, Math.max(1, item.uiScore + delta)));
    const rawScore = Math.round(Math.min(100, Math.max(1, item.rawScore + delta)) * 10) / 10;
    return {
      ...item,
      uiScore,
      rawScore,
      explanation: explainConcern(item.id, uiScore),
    };
  });
  const overall = Math.round(concerns.reduce((sum, item) => sum + item.uiScore, 0) / concerns.length);
  const overallRaw = Math.round((concerns.reduce((sum, item) => sum + item.rawScore, 0) / concerns.length) * 10) / 10;
  return {
    ...baseline,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: "sample",
    concerns,
    overall,
    overallRaw,
    filtered: [],
    engine: "sample-follow-up",
  };
}
