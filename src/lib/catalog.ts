import { concernLabel } from "@/lib/concerns";
import type { ConcernId, Product, Scan } from "@/lib/types";
import rawCatalog from "@/data/products.json";

/** A concern tag or raw score at or above this is "what the product is for". Same cutoff as the export. */
export const CONCERN_SCORE_MIN = 0.6;

const LABEL_TO_ID: Record<string, ConcernId> = {
  acne: "acne",
  pores: "pore",
  "dark circles": "dark_circle",
  "eye bags": "eye_bag",
  wrinkles: "wrinkle",
  firmness: "firmness",
  "tear trough": "tear_trough",
  "age spots": "age_spot",
  radiance: "radiance",
  oiliness: "oiliness",
  hydration: "moisture",
  redness: "redness",
  texture: "texture",
};

const CATEGORY_LABEL: Record<string, string> = {
  kremy: "Creams",
  syvorotkyandampuly: "Serums",
  ochishenie: "Cleansers",
  maskiandbuster: "Masks",
  glazaandguby: "Eyes and lips",
  scrabyandpilyngi: "Exfoliants",
  nabory: "Sets",
  tonikiandmisty: "Toners and mists",
  spf: "SPF",
  specialyhod: "Treatments",
  lechebnuyyhod: "Treatments",
  osnovhoyyhod: "Daily care",
  yhod: "Daily care",
  travel: "Travel",
  bb: "Tint",
  telo: "Body",
  volosy: "Hair",
  hair: "Hair",
  device: "Devices",
  dlyarykandnog: "Hands",
};

const CATEGORY_PRIORITY = [
  "spf",
  "ochishenie",
  "tonikiandmisty",
  "syvorotkyandampuly",
  "kremy",
  "glazaandguby",
  "maskiandbuster",
  "scrabyandpilyngi",
  "specialyhod",
  "lechebnuyyhod",
  "nabory",
  "bb",
  "osnovhoyyhod",
  "yhod",
  "travel",
  "telo",
  "volosy",
  "hair",
  "device",
  "dlyarykandnog",
];

const OFF_FACE = new Set(["telo", "volosy", "hair", "device", "dlyarykandnog"]);

type RawScores = {
  oily: number;
  dry: number;
  combination: number;
  balanced: number;
  acne: number;
  blackheads: number;
  pores: number;
  dark_circles: number;
  puffiness: number;
  lines: number;
  eye_lines: number;
  pigmentation: number;
  role_cleanser: number;
  role_cream: number;
};

type RawProduct = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  category_slugs: string[];
  key_ingredients_en: string[];
  skin_concerns_youcam: string[];
  skin_types: string[];
  concern_scores_raw: RawScores | null;
  warnings_en: string[];
  price: number;
  in_stock: boolean;
  size: string | null;
  role: string[];
};

/**
 * Map the export's 0–1 scores onto YouCam concern ids.
 * lines → wrinkles and firmness. eye_lines → wrinkles and tear trough.
 * pigmentation → age spots and radiance. blackheads and pores → pores.
 * Keyword tags (redness, texture, and the rest) fill a 0.6 when the raw file has no score.
 */
export function concernScoresFromRaw(raw: RawScores | null, tags: string[]): Partial<Record<ConcernId, number>> {
  const scores: Partial<Record<ConcernId, number>> = {};
  const put = (id: ConcernId, value: number | undefined) => {
    if (value == null || Number.isNaN(value)) return;
    scores[id] = Math.max(scores[id] ?? 0, value);
  };

  if (raw) {
    put("oiliness", raw.oily);
    put("moisture", raw.dry);
    put("acne", raw.acne);
    put("pore", Math.max(raw.blackheads, raw.pores));
    put("dark_circle", raw.dark_circles);
    put("eye_bag", raw.puffiness);
    put("wrinkle", Math.max(raw.lines, raw.eye_lines));
    put("firmness", raw.lines);
    put("tear_trough", raw.eye_lines);
    put("age_spot", raw.pigmentation);
    put("radiance", raw.pigmentation);
  }

  for (const tag of tags) {
    const id = LABEL_TO_ID[tag];
    if (!id) continue;
    if ((scores[id] ?? 0) < CONCERN_SCORE_MIN) scores[id] = CONCERN_SCORE_MIN;
  }

  return scores;
}

function categoryFor(slugs: string[]): string {
  const match = CATEGORY_PRIORITY.find((slug) => slugs.includes(slug));
  return match ? (CATEGORY_LABEL[match] ?? "Face") : "Face";
}

function englishSize(size: string | null): string {
  if (!size) return "";
  return size
    .replace(/(\d+)\s*шт/gi, (_, count: string) => `${count} ${count === "1" ? "piece" : "pieces"}`)
    .replace(/мл/gi, "ml")
    .replace(/гр/gi, "g")
    .replace(/г/g, "g")
    .replace(/\s+/g, " ")
    .trim();
}

function simulationFor(scores: Partial<Record<ConcernId, number>>): Record<string, number> {
  const pairs: Array<[ConcernId, string]> = [
    ["wrinkle", "wrinkle"],
    ["pore", "pores"],
    ["texture", "texture"],
    ["acne", "acne"],
    ["redness", "redness"],
    ["radiance", "radiance"],
    ["firmness", "wrinkle"],
  ];
  const simulation: Record<string, number> = {};
  for (const [id, key] of pairs) {
    const weight = scores[id] ?? 0;
    if (weight < CONCERN_SCORE_MIN) continue;
    const intensity = Math.round(Math.min(0.6, Math.max(0.2, weight * 0.6)) * 100) / 100;
    simulation[key] = Math.max(simulation[key] ?? 0, intensity);
  }
  if (!Object.keys(simulation).length) simulation.texture = 0.25;
  return simulation;
}

function toProduct(raw: RawProduct): Product {
  const scores = concernScoresFromRaw(raw.concern_scores_raw, raw.skin_concerns_youcam);
  const concerns = (Object.entries(scores) as Array<[ConcernId, number]>)
    .filter(([, weight]) => weight >= CONCERN_SCORE_MIN)
    .map(([id]) => id);
  const slugs = raw.category_slugs;
  const offFace = slugs.some((slug) => OFF_FACE.has(slug)) && !slugs.includes("face");
  const deviceOrHair = slugs.includes("device") || slugs.includes("hair") || slugs.includes("volosy");
  const hasConcernData = raw.skin_concerns_youcam.length > 0 || raw.concern_scores_raw != null;
  const forFace = slugs.includes("face") && !deviceOrHair && !offFace && hasConcernData && concerns.length > 0;
  const ingredients = raw.key_ingredients_en.map((item) => item.replace(/-/g, " "));
  const concernNames = concerns.map((id) => concernLabel(id).toLowerCase());
  const skin = raw.skin_types.map((item) => (item === "balanced" ? "normal" : item));
  const summary = [
    concernNames.length ? `Targets ${concernNames.join(", ")}.` : "No face concern scored at 0.6 or above.",
    ingredients.length ? `Ingredients called out: ${ingredients.slice(0, 4).join(", ")}.` : "",
    skin.length ? `Listed for ${skin.join(" and ")} skin.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const step = raw.role.includes("cleanser") ? "Cleanse" : raw.role.includes("cream") ? "Cream" : categoryFor(slugs);

  return {
    id: raw.id,
    slug: raw.slug,
    brand: raw.brand,
    name: raw.name,
    price: raw.price,
    size: englishSize(raw.size),
    summary,
    howToUse: `${step} step. Follow the directions printed on the pack.`,
    ingredients: ingredients.join(", "),
    concerns,
    concernScores: scores,
    tracksSkin: forFace,
    forFace,
    warnings: raw.warnings_en,
    category: categoryFor(slugs),
    inStock: raw.in_stock,
    skinTypes: skin,
    tryOn: {
      kind: "simulation",
      label: "Preview this match",
      simulation: simulationFor(scores),
    },
  };
}

const products: Product[] = (rawCatalog as RawProduct[]).map(toProduct);
const bySlug = new Map(products.map((product) => [product.slug, product]));

export function listProducts(): Product[] {
  return products;
}

export function listFaceProducts(): Product[] {
  return products.filter((product) => product.forFace);
}

export function getProduct(slug: string): Product | undefined {
  return bySlug.get(slug);
}

export function productsForConcern(id: ConcernId): Product[] {
  return listFaceProducts()
    .filter((product) => product.concerns.includes(id))
    .sort((a, b) => (b.concernScores[id] ?? 0) - (a.concernScores[id] ?? 0) || a.name.localeCompare(b.name));
}

export function productCategory(product: Product): string {
  return product.category;
}

/** How well a product's 0–1 scores line up with the concerns this scan actually needs. */
export function matchScore(product: Product, scan: Scan | null): number {
  if (!product.forFace) return 0;
  if (!scan) {
    return product.concerns.reduce((sum, id) => sum + (product.concernScores[id] ?? 0), 0);
  }
  let score = 0;
  for (const id of product.concerns) {
    const weight = product.concernScores[id] ?? 0;
    const found = scan.concerns.find((item) => item.id === id);
    if (!found) continue;
    const need = Math.max(0, 85 - found.uiScore) / 85;
    score += weight * need;
  }
  return Math.round(score * 1000) / 1000;
}

export function formatPrice(price: number): string {
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(price);
  return `₪${amount}`;
}

export function ingredientPills(product: Product): string[] {
  return product.ingredients
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
}
