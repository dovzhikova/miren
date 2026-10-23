import type { ConcernId, Product } from "@/lib/types";

export const products: Product[] = [
  {
    slug: "line-soft-serum",
    name: "Line Soft Serum",
    price: 34,
    size: "30 ml",
    summary: "A slow retinal-style serum for lines, texture, and the look of firmness.",
    howToUse: "Night only, two or three evenings a week at first. Follow with a plain cream.",
    ingredients: "Encapsulated retinal, peptide blend, glycerin.",
    concerns: ["wrinkle", "texture", "firmness"],
    tracksSkin: true,
    caution: {
      concern: "redness",
      below: 62,
      reason: "Redness is high enough that a retinoid-style serum should wait, or stay on a tiny patch.",
    },
    tryOn: {
      kind: "simulation",
      label: "Preview softer lines",
      simulation: { wrinkle: 0.55, texture: 0.35 },
    },
  },
  {
    slug: "pore-quiet-toner",
    name: "Pore Quiet Toner",
    price: 22,
    size: "150 ml",
    summary: "A watery niacinamide toner for visible pores and midday shine.",
    howToUse: "After cleansing, morning and night. Skip it on nights you use a strong treatment.",
    ingredients: "Niacinamide, zinc, panthenol.",
    concerns: ["pore", "oiliness"],
    tracksSkin: true,
    caution: {
      concern: "moisture",
      below: 58,
      reason: "Hydration is low. A toner can make dryness worse. Repair that first.",
    },
    tryOn: {
      kind: "simulation",
      label: "Preview quieter pores",
      simulation: { pores: 0.55, texture: 0.25 },
    },
  },
  {
    slug: "barrier-cloud-cream",
    name: "Barrier Cloud Cream",
    price: 28,
    size: "50 ml",
    summary: "A ceramide cream for skin that looks dry or easily flushed.",
    howToUse: "Last step, morning and night. Use it as the buffer under stronger treatments.",
    ingredients: "Ceramides, cholesterol, glycerin, oat.",
    concerns: ["moisture", "redness"],
    tracksSkin: true,
    tryOn: {
      kind: "simulation",
      label: "Preview calmer, more comfortable skin",
      simulation: { redness: 0.45, texture: 0.25, radiance: 0.2 },
    },
  },
  {
    slug: "clear-breakout-gel",
    name: "Clear Breakout Gel",
    price: 26,
    size: "20 ml",
    summary: "A leave-on gel for blemishes. It is a treatment, not a moisturizer.",
    howToUse: "Thin layer at night on the areas that break out. Stop if the skin stings for more than a few minutes.",
    ingredients: "Azelaic-style acid, niacinamide, allantoin.",
    concerns: ["acne"],
    tracksSkin: true,
    caution: {
      concern: "redness",
      below: 62,
      reason: "Redness is already loud. An acid gel can make it louder. Patch-test on one spot.",
    },
    tryOn: {
      kind: "simulation",
      label: "Preview fewer blemishes",
      simulation: { acne: 0.6 },
    },
  },
  {
    slug: "even-tone-drops",
    name: "Even Tone Drops",
    price: 30,
    size: "30 ml",
    summary: "A pigment serum for dark spots and a flat, dull look.",
    howToUse: "Morning, under sunscreen. Pigment comes back if the sun gets to it.",
    ingredients: "Tranexamic-style complex, niacinamide, licorice root.",
    concerns: ["age_spot", "radiance"],
    tracksSkin: true,
    tryOn: {
      kind: "simulation",
      label: "Preview a more even tone",
      simulation: { spots: 0.5, radiance: 0.35 },
    },
  },
  {
    slug: "rested-eye-concentrate",
    name: "Rested Eye Concentrate",
    price: 32,
    size: "15 ml",
    summary: "A small-area concentrate for shadow, puffiness, and the groove under the eye.",
    howToUse: "Pea-size for both eyes, morning. Tap, don't drag.",
    ingredients: "Caffeine, peptide, light glycerin.",
    concerns: ["dark_circle", "eye_bag", "tear_trough"],
    tracksSkin: true,
    tryOn: {
      kind: "simulation",
      label: "Preview a more rested eye area",
      simulation: { dark_circle: 0.5, eye_bags: 0.45 },
    },
  },
  {
    slug: "dew-face-oil",
    name: "Dew Face Oil",
    price: 29,
    size: "30 ml",
    summary: "A squalane oil for skin that looks dry and dull. Not for skin that already looks oily.",
    howToUse: "Two drops mixed into cream at night.",
    ingredients: "Squalane, jojoba, vitamin E.",
    concerns: ["moisture", "radiance"],
    tracksSkin: true,
    hardSkip: {
      concern: "oiliness",
      below: 62,
      reason: "Oil balance is low, which means the skin already looks oily. An oil will sit on top.",
    },
    tryOn: {
      kind: "simulation",
      label: "Preview a bit more glow",
      simulation: { radiance: 0.4, texture: 0.2 },
    },
  },
  {
    slug: "matte-balance-fluid",
    name: "Matte Balance Fluid",
    price: 27,
    size: "40 ml",
    summary: "A light fluid that takes down shine without a powdery cast.",
    howToUse: "Morning, under sunscreen. Skip on days your skin feels tight.",
    ingredients: "Silica, niacinamide, green-tea extract.",
    concerns: ["oiliness", "pore"],
    tracksSkin: true,
    caution: {
      concern: "moisture",
      below: 60,
      reason: "The skin looks dry. A mattifying fluid will fight the cream you actually need.",
    },
    tryOn: {
      kind: "simulation",
      label: "Preview a less shiny surface",
      simulation: { pores: 0.45, texture: 0.3 },
    },
  },
  {
    slug: "soft-lip-tint",
    name: "Soft Lip Tint",
    price: 16,
    size: "4 ml",
    summary: "A berry tint. It changes color, not a skin score.",
    howToUse: "One swipe. Blot if you want it quieter.",
    ingredients: "Pigment, jojoba, vitamin E.",
    concerns: [],
    tracksSkin: false,
    tryOn: {
      kind: "makeup",
      label: "Try the tint",
      effects: [
        {
          category: "lip_color",
          shape: { name: "original" },
          palettes: [{ color: "#a24b5c", texture: "matte", colorIntensity: 48 }],
          style: { type: "full" },
        },
        { category: "skin_smooth", skinSmoothStrength: 8, skinSmoothColorIntensity: 6 },
      ],
    },
  },
  {
    slug: "veil-complexion-tint",
    name: "Veil Complexion Tint",
    price: 31,
    size: "30 ml",
    summary: "A light tinted fluid in a neutral beige. Coverage is sheer on purpose.",
    howToUse: "A pea-size, pressed in with fingers. It is makeup, so it washes off.",
    ingredients: "Pigment, glycerin, squalane.",
    concerns: [],
    tracksSkin: false,
    tryOn: {
      kind: "makeup",
      label: "Try the veil",
      effects: [
        { category: "skin_smooth", skinSmoothStrength: 18, skinSmoothColorIntensity: 12 },
        {
          category: "foundation",
          palettes: [{ color: "#d7b09a", colorIntensity: 35, glowIntensity: 18, coverageIntensity: 32 }],
        },
      ],
    },
  },
  {
    slug: "bounce-firming-cream",
    name: "Bounce Firming Cream",
    price: 36,
    size: "50 ml",
    summary: "A peptide cream for skin that already looks slack. A duplicate if firmness is fine.",
    howToUse: "Night, after serum. Give it a month before you judge it.",
    ingredients: "Peptide blend, shea, ceramides.",
    concerns: ["firmness"],
    tracksSkin: true,
    tryOn: {
      kind: "simulation",
      label: "Preview a firmer look",
      simulation: { wrinkle: 0.4, texture: 0.3 },
    },
  },
];

const bySlug = new Map(products.map((product) => [product.slug, product]));

export function listProducts(): Product[] {
  return products;
}

export function getProduct(slug: string): Product | undefined {
  return bySlug.get(slug);
}

export function productsForConcern(id: ConcernId): Product[] {
  return products.filter((product) => product.concerns.includes(id));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}
