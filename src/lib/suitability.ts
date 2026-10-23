import { CONCERN_SCORE_MIN, getProduct } from "@/lib/catalog";
import type { Product, Scan, Suitability, SuitabilityVerdict } from "@/lib/types";

function warningNote(product: Product): string | undefined {
  if (!product.warnings.length) return undefined;
  return `Low-confidence note from the product text: ${product.warnings.join(", ")}. Keyword flags are noisy, so this is not a skip.`;
}

export function suitProduct(product: Product, scan: Scan | null): Suitability {
  const note = warningNote(product);

  if (!product.tracksSkin || !product.forFace) {
    return {
      verdict: "patch-test",
      title: "Not a face match",
      reasons: ["Body, hair, and devices are not checked against a face scan."],
      warningNote: note,
    };
  }

  if (!scan) {
    return {
      verdict: "patch-test",
      title: "Scan first",
      reasons: ["A shelf guess is not a check. Scan once, then ask again."],
      warningNote: note,
    };
  }

  const targeted = product.concerns.filter((id) => (product.concernScores[id] ?? 0) >= CONCERN_SCORE_MIN);
  const rows = targeted.flatMap((id) => {
    const found = scan.concerns.find((item) => item.id === id);
    const weight = product.concernScores[id] ?? 0;
    return found ? [{ id, weight, found }] : [];
  });

  if (!rows.length) {
    return {
      verdict: "patch-test",
      title: "No strong concern score",
      reasons: ["Nothing on this product is scored at 0.6 or above for a concern in this scan."],
      warningNote: note,
    };
  }

  if (rows.every((row) => row.found.uiScore >= 85)) {
    return {
      verdict: "skip",
      title: "You don't need this",
      reasons: [
        `${rows.map((row) => `${row.found.label} ${row.found.uiScore}`).join(", ")} already ${rows.length === 1 ? "looks" : "look"} steady. The catalog scores do not change that.`,
      ],
      warningNote: note,
    };
  }

  const weakest = [...rows].sort((a, b) => a.found.uiScore - b.found.uiScore)[0];
  const lead = [...rows].sort((a, b) => b.weight * (100 - b.found.uiScore) - a.weight * (100 - a.found.uiScore))[0];
  const catalog = Math.round(lead.weight * 100);

  if (weakest.found.uiScore < 75) {
    return {
      verdict: "suits",
      title: "This suits your scan",
      reasons: [
        `${lead.found.label} scored ${lead.found.uiScore} of 100. ${lead.found.direction} This product scores ${catalog} out of 100 on that concern.`,
      ],
      warningNote: note,
    };
  }

  return {
    verdict: "patch-test",
    title: "Patch-test before you commit",
    reasons: [
      `The closest scores are mild: ${rows.map((row) => `${row.found.label} ${row.found.uiScore}`).join(", ")}. Catalog match on ${lead.found.label.toLowerCase()} is ${catalog}. Try a small area first.`,
    ],
    warningNote: note,
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
