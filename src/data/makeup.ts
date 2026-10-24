import type { ConcernId, MakeupEffect, Product } from "@/lib/types";

/**
 * Small colour shelf. Photos are the shade image from each brand's Shopify catalog.
 * Prices are the published US dollar price × 3.7, rounded to shekels.
 * Hex colours are try-on swatches for the named shade, not a lab reading of the formula.
 * Skin smooth is set to 0 so the engine does not add its default blur.
 */
export type MakeupSource = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  price: number;
  size: string;
  summary: string;
  category: "Lip" | "Blush" | "Tint" | "Concealer";
  finish: NonNullable<Product["finish"]>;
  concerns: Partial<Record<ConcernId, number>>;
  image: string;
  effects: MakeupEffect[];
};

const smooth = { category: "skin_smooth", skinSmoothStrength: 0, skinSmoothColorIntensity: 0 };

export const MAKEUP: MakeupSource[] = [
  {
    id: "MK_RARE_LIP",
    slug: "kind-words-talented",
    brand: "Rare Beauty",
    name: "Kind Words Matte Lipstick in Talented",
    price: 74,
    size: "3.5 g",
    summary: "Matte lipstick. Suits a face whose low score is oil, and asks for a patch-test when hydration is the low score.",
    category: "Lip",
    finish: "matte",
    concerns: { oiliness: 0.85 },
    image: "https://cdn.shopify.com/s/files/1/0314/1143/7703/products/kind-words-matte-lipstick-talented.jpg?v=1762280633",
    effects: [
      smooth,
      {
        category: "lip_color",
        shape: { name: "original" },
        palettes: [{ color: "#A86B74", texture: "matte", colorIntensity: 62 }],
        style: { type: "full" },
      },
    ],
  },
  {
    id: "MK_ILIA_LIP",
    slug: "color-block-cinnabar",
    brand: "ILIA",
    name: "Color Block Lipstick in Cinnabar",
    price: 107,
    size: "4 g",
    summary: "Satin lipstick. The cream finish is the match when hydration is the low score.",
    category: "Lip",
    finish: "satin",
    concerns: { moisture: 0.8, radiance: 0.7 },
    image: "https://cdn.shopify.com/s/files/1/0560/0673/8000/files/Color-Block-Lipstick_Cinnabar_white.jpg?v=1722980870",
    effects: [
      smooth,
      {
        category: "lip_color",
        shape: { name: "original" },
        palettes: [{ color: "#9C3B32", texture: "satin", colorIntensity: 58 }],
        style: { type: "full" },
      },
    ],
  },
  {
    id: "MK_RARE_BLUSH",
    slug: "soft-pinch-hope",
    brand: "Rare Beauty",
    name: "Soft Pinch Liquid Blush in Hope",
    price: 93,
    size: "7.5 ml",
    summary: "Liquid blush. A little colour for a face that looks dry or dull, without a full base.",
    category: "Blush",
    finish: "satin",
    concerns: { moisture: 0.75, radiance: 0.82 },
    image: "https://cdn.shopify.com/s/files/1/0314/1143/7703/files/ECOMM-SP-LIQUID-BLUSH-DEWY-HOPE.jpg?v=1762200490",
    effects: [
      smooth,
      {
        category: "blush",
        pattern: { name: "1color1" },
        palettes: [{ color: "#E7A090", texture: "satin", glowStrength: 40, colorIntensity: 46 }],
      },
    ],
  },
  {
    id: "MK_T28_BLUSH",
    slug: "beachplease-magic-hour",
    brand: "Tower 28",
    name: "BeachPlease Cream Blush in Magic Hour",
    price: 74,
    size: "5 g",
    summary: "Cream blush. Colour that sits with a low hydration score instead of a powder that can cling.",
    category: "Blush",
    finish: "cream",
    concerns: { moisture: 0.8, radiance: 0.7 },
    image: "https://cdn.shopify.com/s/files/1/2926/6108/files/BeachPlease_20Magic_20Hour_90ccf943-90c1-4d08-b927-64bf2dae2b60.webp?v=1745444273",
    effects: [
      smooth,
      {
        category: "blush",
        pattern: { name: "1color1" },
        palettes: [{ color: "#E08A6E", texture: "satin", glowStrength: 28, colorIntensity: 42 }],
      },
    ],
  },
  {
    id: "MK_ILIA_TINT",
    slug: "super-serum-skye",
    brand: "ILIA",
    name: "Super Serum Skin Tint SPF 40 in Skye",
    price: 178,
    size: "30 ml",
    summary: "Sheer skin tint with SPF 40. Light coverage for dull or dry-looking skin. Not a full-coverage base.",
    category: "Tint",
    finish: "sheer",
    concerns: { moisture: 0.7, radiance: 0.85, texture: 0.65 },
    image: "https://cdn.shopify.com/s/files/1/0560/0673/8000/files/Skyeppageimage_5450a883-1724-4b79-960c-26a3874d09fc.jpg?v=1710264865",
    effects: [
      smooth,
      {
        category: "foundation",
        palettes: [{ color: "#EDC8A6", colorIntensity: 32, glowIntensity: 36, coverageIntensity: 24 }],
      },
    ],
  },
  {
    id: "MK_KOSAS_CONCEALER",
    slug: "revealer-concealer-05",
    brand: "Kosas",
    name: "Revealer Concealer in Tone 0.5 N",
    price: 118,
    size: "5.4 ml",
    summary: "Light concealer for under-eye shadow and small spots. It is a spot step, not a full face of base.",
    category: "Concealer",
    finish: "satin",
    concerns: { dark_circle: 0.9, tear_trough: 0.85, age_spot: 0.7 },
    image: "https://cdn.shopify.com/s/files/1/0131/5409/1065/files/RC2024_0.5_vessel.jpg?v=1770932034",
    effects: [
      smooth,
      {
        category: "concealer",
        palettes: [{ color: "#F4D2C4", colorIntensity: 42, colorUnderEyeIntensity: 48, coverageLevel: 36 }],
      },
    ],
  },
];
