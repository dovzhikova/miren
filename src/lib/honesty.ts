import { SHELF_COUNT, listFaceProducts } from "@/lib/catalog";
import { DEMO_RAW_MOVE, OBSERVATION_DAYS } from "@/lib/progress";
import { YOUCAM_APIS } from "@/lib/youcam/apis";

export const CLOSED_LOOP = "Match → Try-on/Simulate → Re-scan verdict.";
export const SHOPIFY_GATE_LINE = "Same YouCam scores that rank the shelf also gate the Shopify cart.";
export const DISAMBIGUATION = "This web app is not the App Store app GlowCheck AI (id 6760979781).";
export const DEMO_PREVIEW_CAPTION = "Generated demo preview. YouCam was not called.";
export const LIGHTING_TIP = "Lighting tip: face a window. Colored lights shift the scores.";
export const DEMO_SCAN_LINE = "Demo data · generated example scores";
export const SAMPLE_FACE = "/demo/sample-face.jpg";

export const DEMO_FIXTURES = {
  simulation: "/demo/sample-simulation.jpg",
  makeup: "/demo/sample-makeup.jpg",
} as const;

export function demoFixturePath(kind: string | undefined): string {
  return kind === "makeup" ? DEMO_FIXTURES.makeup : DEMO_FIXTURES.simulation;
}

/** Copy for the judge-facing methods page. No medical or causation claims. */
export function honestyPoints(): string[] {
  const face = listFaceProducts().length;
  return [
    `YouCam APIs used when Live YouCam is connected: ${YOUCAM_APIS.join(", ")}.`,
    "What is not validated: this is not a medical diagnosis, and a score change does not establish that a product caused it. Causation is unknown.",
    `${LIGHTING_TIP} Dim, colored, or uneven light lowers confidence in a photo read.`,
    "Demo mode uses generated example scores and does not call YouCam. My scans are measured only when Live YouCam is connected and you send a photo.",
    "Moles and eyelid shape are filtered out before products are matched.",
    `A re-scan move of ±${DEMO_RAW_MOVE} raw points is a demo display heuristic, not proven efficacy. Under ${OBSERVATION_DAYS} days is too early to judge.`,
    `${SHELF_COUNT}-product shelf, ${face} of them face products.`,
    SHOPIFY_GATE_LINE,
    DISAMBIGUATION,
    "Built solo by a woman for the Women in Tech hackathon.",
  ];
}
