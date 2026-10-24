import { listFaceProducts, listMakeupProducts, matchScore, type RoutineRole } from "@/lib/catalog";
import { suitProduct, verdictRank } from "@/lib/suitability";
import type { Product, Scan } from "@/lib/types";

/** Short routine shown on results and as the shelf default. */
export const FOR_YOU_LIMIT = 8;

/**
 * A short list for this scan.
 * Concerns under 75 lead. Suits beats patch-test. Skip stays off the list.
 * Roles are spread so the list is a routine, not eight serums.
 */
export function forYouProducts(scan: Scan | null, limit = FOR_YOU_LIMIT): Product[] {
  const focus = new Set((scan?.concerns ?? []).filter((item) => item.uiScore < 75).map((item) => item.id));
  const pool = listFaceProducts().filter((product) => {
    if (suitProduct(product, scan).verdict === "skip") return false;
    if (!scan || focus.size === 0) return true;
    return product.concerns.some((id) => focus.has(id));
  });

  const ranked = [...pool].sort((a, b) => {
    const verdict = verdictRank(suitProduct(a, scan).verdict) - verdictRank(suitProduct(b, scan).verdict);
    return verdict || matchScore(b, scan) - matchScore(a, scan) || a.name.localeCompare(b.name);
  });

  const picked: Product[] = [];
  const used = new Map<RoutineRole, number>();
  const take = (cap: number) => {
    for (const product of ranked) {
      if (picked.length >= limit) return;
      if (picked.some((item) => item.slug === product.slug)) continue;
      const count = used.get(product.routineRole) ?? 0;
      if (count >= cap) continue;
      picked.push(product);
      used.set(product.routineRole, count + 1);
    }
  };

  take(1);
  if (picked.length < 6) take(2);
  return picked;
}

/** Colour for this scan. One of each step, suits ahead of patch-test, at most four. */
export function makeupForYou(scan: Scan | null, limit = 4): Product[] {
  if (!scan) return [];
  const ranked = listMakeupProducts()
    .filter((product) => suitProduct(product, scan).verdict !== "skip")
    .sort((a, b) => {
      const verdict = verdictRank(suitProduct(a, scan).verdict) - verdictRank(suitProduct(b, scan).verdict);
      return verdict || matchScore(b, scan) - matchScore(a, scan) || a.name.localeCompare(b.name);
    });
  const picked: Product[] = [];
  const used = new Map<string, number>();
  const take = (cap: number) => {
    for (const product of ranked) {
      if (picked.length >= limit) return;
      if (picked.some((item) => item.slug === product.slug)) continue;
      const count = used.get(product.category) ?? 0;
      if (count >= cap) continue;
      picked.push(product);
      used.set(product.category, count + 1);
    }
  };
  take(1);
  if (picked.length < 3) take(2);
  return picked;
}
