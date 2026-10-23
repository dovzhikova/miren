import { getProduct } from "@/lib/catalog";
import type { Product, Scan, Suitability, SuitabilityVerdict } from "@/lib/types";

function concern(scan: Scan, id: string) {
  return scan.concerns.find((item) => item.id === id);
}

export function suitProduct(product: Product, scan: Scan | null): Suitability {
  if (!product.tracksSkin) {
    return {
      verdict: "suits",
      title: "Fine to buy for the look",
      reasons: ["This is color, not a treatment. It will not move a skin score. Buy it if you like the shade."],
    };
  }

  if (!scan) {
    return {
      verdict: "patch-test",
      title: "Scan first",
      reasons: ["A shelf guess is not a check. Scan once, then ask again."],
    };
  }

  if (product.hardSkip) {
    const blocker = concern(scan, product.hardSkip.concern);
    if (blocker && blocker.uiScore < product.hardSkip.below) {
      return { verdict: "skip", title: "Leave this one", reasons: [product.hardSkip.reason] };
    }
  }

  const targeted = product.concerns
    .map((id) => concern(scan, id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!targeted.length) {
    return {
      verdict: "patch-test",
      title: "No score to match",
      reasons: ["This scan did not include the concerns this product is for."],
    };
  }

  const weakest = [...targeted].sort((a, b) => a.uiScore - b.uiScore)[0];
  const cautionHit =
    product.caution != null && (concern(scan, product.caution.concern)?.uiScore ?? 100) < product.caution.below;

  if (targeted.every((item) => item.uiScore >= 85)) {
    return {
      verdict: "skip",
      title: "You don't need this",
      reasons: [
        `${targeted.map((item) => `${item.label} ${item.uiScore}`).join(", ")} already ${targeted.length === 1 ? "looks" : "look"} steady. This would be a duplicate buy.`,
      ],
    };
  }

  if (weakest.uiScore < 75 && cautionHit && product.caution) {
    return {
      verdict: "patch-test",
      title: "Patch-test before you commit",
      reasons: [
        product.caution.reason,
        `${weakest.label} is ${weakest.uiScore}, so the product has a job, but not on your whole face yet.`,
      ],
    };
  }

  if (weakest.uiScore < 75) {
    return {
      verdict: "suits",
      title: "This suits your scan",
      reasons: [
        `${weakest.label} is ${weakest.uiScore} of 100. ${weakest.direction} That is low enough for this product to earn a place.`,
      ],
    };
  }

  return {
    verdict: "patch-test",
    title: "Optional, not essential",
    reasons: [
      `Matching scores are mild: ${targeted.map((item) => `${item.label} ${item.uiScore}`).join(", ")}. Try a small area before you make it a habit.`,
    ],
  };
}

export function suitBySlug(slug: string, scan: Scan | null): Suitability | null {
  const product = getProduct(slug);
  if (!product) return null;
  return suitProduct(product, scan);
}

export function verdictRank(verdict: SuitabilityVerdict): number {
  if (verdict === "suits") return 0;
  if (verdict === "patch-test") return 1;
  return 2;
}
