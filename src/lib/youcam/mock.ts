import { clampScore, concernDirection, explainConcern } from "@/lib/concerns";
import { parseYoucamResult } from "@/lib/youcam/parse";
import type { ConcernId, Scan } from "@/lib/types";

type SeedScore = {
  id: ConcernId | "mole" | "hd_droopy_upper_eyelid";
  type: string;
  region?: string;
  raw: number;
  ui: number;
};

const BASELINE: SeedScore[] = [
  { id: "wrinkle", type: "hd_wrinkle", region: "whole", raw: 49.6, ui: 65 },
  { id: "pore", type: "hd_pore", region: "whole", raw: 49.2, ui: 67 },
  { id: "moisture", type: "hd_moisture", raw: 48.7, ui: 70 },
  { id: "oiliness", type: "hd_oiliness", raw: 60.7, ui: 72 },
  { id: "texture", type: "hd_texture", region: "whole", raw: 66.4, ui: 75 },
  { id: "acne", type: "hd_acne", region: "whole", raw: 59.9, ui: 76 },
  { id: "dark_circle", type: "hd_dark_circle", raw: 80.2, ui: 76 },
  { id: "redness", type: "hd_redness", raw: 72.0, ui: 77 },
  { id: "age_spot", type: "hd_age_spot", raw: 83.2, ui: 77 },
  { id: "tear_trough", type: "hd_tear_trough", raw: 74.0, ui: 78 },
  { id: "eye_bag", type: "hd_eye_bag", raw: 76.7, ui: 79 },
  { id: "radiance", type: "hd_radiance", raw: 76.6, ui: 79 },
  { id: "firmness", type: "hd_firmness", raw: 89.7, ui: 85 },
  { id: "mole", type: "mole", region: "cheek", raw: 42, ui: 50 },
  { id: "hd_droopy_upper_eyelid", type: "hd_droopy_upper_eyelid", raw: 79.1, ui: 80 },
];

function hashBytes(bytes: Buffer): number {
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deltaFor(seed: number, index: number, scenario: "baseline" | "followup" | "auto", id: string): number {
  if (scenario === "baseline" || seed === 0) return 0;
  if (scenario === "followup") {
    if (id === "wrinkle" || id === "pore" || id === "moisture" || id === "texture") return 8;
    if (id === "acne") return -6;
    if (id === "mole" || id.includes("eyelid")) return 0;
    return 1;
  }
  return ((seed >> (index % 24)) & 7) - 3;
}

export function buildMockPayload(bytes: Buffer, scenario: "baseline" | "followup" | "auto" = "auto") {
  const seed = scenario === "baseline" ? 0 : scenario === "followup" ? 1 : hashBytes(bytes);
  const output = BASELINE.map((item, index) => {
    const delta = deltaFor(seed, index, scenario, item.id);
    return {
      type: item.type,
      region: item.region ?? "whole",
      raw_score: Math.round(clampScore(item.raw + delta) * 10) / 10,
      ui_score: Math.round(clampScore(item.ui + delta)),
      mask_urls: item.id === "mole" || item.id.includes("eyelid") ? [] : [`https://example.com/mock/${item.type}.png`],
    };
  });
  output.push(
    { type: "all", region: "whole", raw_score: 75.8, ui_score: 76, mask_urls: [] },
    { type: "skin_age", region: "whole", raw_score: 37, ui_score: 37, mask_urls: [] },
    { type: "hd_skin_type", region: "whole", raw_score: 0, ui_score: 0, mask_urls: [] },
  );
  return {
    status: 200,
    data: {
      task_status: "success",
      results: {
        output: output.map((item) =>
          item.type === "hd_skin_type" ? { type: item.type, region: "whole", label: "Combination" } : item,
        ),
      },
    },
  };
}

export function buildMockScan(
  bytes: Buffer,
  options?: {
    scenario?: "baseline" | "followup" | "auto";
    source?: Scan["source"];
    id?: string;
    createdAt?: string;
  },
): Scan {
  const scenario = options?.scenario ?? "auto";
  const parsed = parseYoucamResult(buildMockPayload(bytes, scenario), {
    id: options?.id ?? crypto.randomUUID(),
    createdAt: options?.createdAt ?? new Date().toISOString(),
    source: options?.source ?? "upload",
    mode: "mock",
    auth: "none",
    engine: "mock-youcam-skin-analysis-v2.1",
  });
  parsed.concerns = parsed.concerns.map((concern) => ({
    ...concern,
    explanation: explainConcern(concern.id, concern.uiScore),
    direction: concernDirection(concern.id),
  }));
  return parsed;
}

export function sampleBaselineScan(): Scan {
  return buildMockScan(Buffer.from("glowcheck-baseline"), {
    scenario: "baseline",
    id: "sample-baseline",
    createdAt: "2026-10-01T15:00:00.000Z",
    source: "sample",
  });
}
