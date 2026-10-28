import type { SuitabilityVerdict } from "@/lib/types";

export const HONEST_LABEL = "Cosmetic preview, not a fit or purchase guarantee · not a medical diagnosis";
export const SHOPIFY_HANDOFF = "Demo handoff. A live shop would call the Shopify Storefront Cart API. Nothing was charged, and this is not a Shopify Partner app.";

export type MerchantCartDecision = {
  allowAdd: true;
  warning: string | null;
};

/** Skip and patch-test still reach the cart. The warning is the gate, not a lock. */
export function merchantCartDecision(verdict: SuitabilityVerdict): MerchantCartDecision {
  switch (verdict) {
    case "suits":
      return { allowAdd: true, warning: null };
    case "patch-test":
      return { allowAdd: true, warning: "Patch-test first. You can still add it. This is not a purchase guarantee." };
    case "skip":
      return { allowAdd: true, warning: "Skip on this scan. You can still add it. The warning stays on the cart." };
    default: {
      const exhaustive: never = verdict;
      return exhaustive;
    }
  }
}
