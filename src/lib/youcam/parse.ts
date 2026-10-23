import { clampScore, concernDirection, concernLabel, explainConcern, isConcernId } from "@/lib/concerns";
import type { ConcernId, ConcernScore, FilteredFinding, Scan } from "@/lib/types";

type ScoreBits = {
  raw: number;
  ui: number;
  maskUrl?: string;
};

const ALIASES: Record<string, ConcernId | "skin_type" | "skin_age" | "all"> = {
  acne: "acne",
  pore: "pore",
  pores: "pore",
  wrinkle: "wrinkle",
  wrinkles: "wrinkle",
  texture: "texture",
  redness: "redness",
  oiliness: "oiliness",
  moisture: "moisture",
  radiance: "radiance",
  dark_circle: "dark_circle",
  dark_circles: "dark_circle",
  eye_bag: "eye_bag",
  eye_bags: "eye_bag",
  tear_trough: "tear_trough",
  age_spot: "age_spot",
  spots: "age_spot",
  firmness: "firmness",
  skin_type: "skin_type",
  skin_age: "skin_age",
  all: "all",
  overall: "all",
};

function hiddenReason(key: string): FilteredFinding["reason"] | null {
  if (/mole|nevus|naevus|melanocytic/i.test(key)) return "mole";
  if (/eyelid|droopy_upper|droopy_lower/i.test(key)) return "eyelid";
  return null;
}

function normalizeKey(type: string): string {
  return type
    .trim()
    .toLowerCase()
    .replace(/^hd_/, "")
    .replace(/_v2$/, "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function readScore(value: unknown): ScoreBits | null {
  const record = asRecord(value);
  if (!record) return null;
  const raw = numberFrom(record.raw_score);
  const ui = numberFrom(record.ui_score);
  if (raw == null && ui == null) return null;
  const mask = firstString(record.mask_urls) ?? stringField(record.output_mask_name);
  return {
    raw: raw ?? ui ?? 0,
    ui: ui ?? Math.round(raw ?? 0),
    maskUrl: mask,
  };
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const found = value.find((item) => typeof item === "string" && item.trim());
    return typeof found === "string" ? found : undefined;
  }
  return undefined;
}

function preferWhole(regions: { region?: string; bits: ScoreBits }[]): ScoreBits {
  const whole = regions.find((item) => !item.region || /whole|all|overall/i.test(item.region));
  if (whole) return whole.bits;
  const raw = regions.reduce((sum, item) => sum + item.bits.raw, 0) / regions.length;
  const ui = regions.reduce((sum, item) => sum + item.bits.ui, 0) / regions.length;
  const mask = regions.find((item) => item.bits.maskUrl)?.bits.maskUrl;
  return { raw, ui, maskUrl: mask };
}

function readSkinType(value: unknown, depth = 0): string | null {
  if (typeof value === "string" && value.trim() && !/^\d+(\.\d+)?$/.test(value.trim())) {
    return value.trim();
  }
  if (depth > 2) return null;
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ["whole", "skin_type", "label", "value", "category"]) {
    if (key in record) {
      const found = readSkinType(record[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function envelope(body: unknown): Record<string, unknown> {
  const record = asRecord(body) ?? {};
  return asRecord(record.data) ?? asRecord(record.result) ?? record;
}

export function youcamErrorMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case "error_no_face":
      return "YouCam could not find a face. Use a front-facing photo with your full face in frame.";
    case "error_pose":
      return "Look straight at the camera, with your head level, and try again.";
    case "error_face_parsing":
      return "The face was too hard to map. Pull hair off your forehead and retake the photo.";
    case "error_lighting_dark":
      return "The photo is too dark. Face a window or a soft lamp and try again.";
    case "error_src_face_too_small":
      return "Move closer. Your face needs to fill more of the frame.";
    case "error_src_face_out_of_bound":
      return "The face is cut off. Include your forehead, cheeks, and chin.";
    case "error_below_min_image_size":
    case "error_exceed_max_image_size":
      return "That photo is the wrong size. Use a clear JPEG or PNG, at least 480 pixels on the short side.";
    case "exceed_max_filesize":
      return "That photo is too large. Try one under 10 MB.";
    case "error_nsfw_content_detected":
      return "YouCam rejected this photo. Use a normal face selfie.";
    case "InvalidApiKey":
      return "YouCam rejected the API key. Check YOUCAM_API_KEY and YOUCAM_PUBLIC_KEY.";
    case "CreditInsufficiency":
      return "The YouCam account is out of units. Remove the API key to keep using sample mode.";
    case "invalid_parameter":
    case "InvalidParameters":
      return "YouCam rejected the analysis settings. Try the photo again.";
    default:
      return fallback || "YouCam could not finish this photo. Try another one in even light.";
  }
}

function pushFiltered(filtered: FilteredFinding[], key: string) {
  const reason = hiddenReason(key);
  if (!reason) return false;
  if (!filtered.some((item) => item.key === key && item.reason === reason)) {
    filtered.push({ key, reason });
  }
  return true;
}

export function parseYoucamResult(body: unknown, extras?: Partial<Pick<Scan, "id" | "createdAt" | "source" | "mode" | "auth" | "engine">>): Scan {
  const data = envelope(body);
  const results = asRecord(data.results) ?? data;
  const output = Array.isArray(results.output) ? results.output : null;
  const filtered: FilteredFinding[] = [];
  const grouped = new Map<ConcernId, { region?: string; bits: ScoreBits }[]>();
  let skinAge: number | null = null;
  let skinType: string | null = null;
  let overall: number | null = null;
  let overallRaw: number | null = null;

  const absorb = (key: string, value: unknown, region?: string) => {
    if (pushFiltered(filtered, key)) return;
    const alias = ALIASES[normalizeKey(key)];
    if (!alias) return;
    if (alias === "skin_age") {
      const direct = numberFrom(value);
      const record = asRecord(value);
      skinAge = direct ?? numberFrom(record?.score) ?? numberFrom(record?.raw_score) ?? skinAge;
      return;
    }
    if (alias === "all") {
      const record = asRecord(value);
      overall = numberFrom(record?.score) ?? numberFrom(record?.ui_score) ?? numberFrom(value) ?? overall;
      overallRaw = numberFrom(record?.raw_score) ?? numberFrom(record?.score) ?? overallRaw;
      return;
    }
    if (alias === "skin_type") {
      const label = readSkinType(value);
      if (label && (!region || /whole|all/i.test(region))) skinType = label;
      else if (label && !skinType) skinType = label;
      return;
    }
    const bits = readScore(value);
    if (!bits) return;
    const list = grouped.get(alias) ?? [];
    list.push({ region, bits });
    grouped.set(alias, list);
  };

  if (output) {
    for (const item of output) {
      const record = asRecord(item);
      if (!record) continue;
      const type = stringField(record.type) ?? stringField(record.action) ?? "";
      if (!type) continue;
      const region = stringField(record.region);
      if (record.raw_score != null || record.ui_score != null || record.score != null) {
        absorb(type, record, region);
      } else {
        absorb(type, record.skin_type ?? record.label ?? record.value ?? record, region);
      }
    }
  } else {
    for (const [key, value] of Object.entries(results)) {
      if (key === "output" || key === "url" || key === "mask_urls") continue;
      const record = asRecord(value);
      if (record && !("raw_score" in record) && !("ui_score" in record) && !("score" in record)) {
        const regionEntries = Object.entries(record);
        if (regionEntries.length && regionEntries.every(([, regionValue]) => readScore(regionValue) || typeof regionValue === "string")) {
          for (const [region, regionValue] of regionEntries) absorb(key, regionValue, region);
          continue;
        }
      }
      absorb(key, value);
    }
  }

  const concerns: ConcernScore[] = [];
  for (const id of [...grouped.keys()]) {
    if (!isConcernId(id)) continue;
    const bits = preferWhole(grouped.get(id) ?? []);
    const uiScore = Math.round(clampScore(bits.ui));
    concerns.push({
      id,
      label: concernLabel(id),
      rawScore: Math.round(clampScore(bits.raw) * 10) / 10,
      uiScore,
      explanation: explainConcern(id, uiScore),
      direction: concernDirection(id),
      maskUrl: bits.maskUrl,
    });
  }

  concerns.sort((a, b) => a.uiScore - b.uiScore || a.label.localeCompare(b.label));

  if (overall == null && concerns.length) {
    overall = concerns.reduce((sum, item) => sum + item.uiScore, 0) / concerns.length;
  }
  if (overallRaw == null && concerns.length) {
    overallRaw = concerns.reduce((sum, item) => sum + item.rawScore, 0) / concerns.length;
  }

  return {
    id: extras?.id ?? "pending",
    createdAt: extras?.createdAt ?? new Date(0).toISOString(),
    source: extras?.source ?? "upload",
    mode: extras?.mode ?? "live",
    auth: extras?.auth ?? "none",
    engine: extras?.engine ?? "youcam-skin-analysis-v2.1",
    overall: Math.round(clampScore(overall ?? 0)),
    overallRaw: Math.round(clampScore(overallRaw ?? overall ?? 0) * 10) / 10,
    skinAge: skinAge == null ? null : Math.round(skinAge),
    skinType,
    concerns,
    filtered,
  };
}
