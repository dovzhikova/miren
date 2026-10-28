import { CONCERN_IDS, type ConcernId } from "@/lib/types";

type Band = "steady" | "mild" | "active" | "priority";

type ConcernCopy = {
  label: string;
  direction: string;
  steady: string;
  mild: string;
  active: string;
  priority: string;
};

const COPY: Record<ConcernId, ConcernCopy> = {
  acne: {
    label: "Breakouts",
    direction: "Higher means fewer visible blemishes.",
    steady: "Breakouts are barely in this photo. A strong acne treatment would be extra.",
    mild: "A few blemishes, not a pattern. If you use an acne product, keep it gentle.",
    active: "Breakouts are visible enough to shop for. A treatment fits better than another rich cream.",
    priority: "Breakouts are the loudest finding. Treat them before you add oils or heavy creams.",
  },
  pore: {
    label: "Pores",
    direction: "Higher means pores look less obvious.",
    steady: "Pores look quiet. A pore toner is optional, not a fix.",
    mild: "Pores show a little, mostly where skin is oilier. A light niacinamide toner is enough.",
    active: "Pores are easy to see. Look for something that clears oil without stripping.",
    priority: "Pores are a main event in this photo. Start there before you add more layers.",
  },
  wrinkle: {
    label: "Lines",
    direction: "Higher means lines look softer.",
    steady: "Lines look soft for this photo. A firming serum would be maintenance, not a rescue.",
    mild: "Fine lines are there, not deep. A slow retinoid-style serum is a reasonable buy.",
    active: "Lines are one of the clearer findings. A dedicated serum beats a general moisturizer.",
    priority: "Lines are the priority on this scan. Shop a treatment, and give it weeks, not days.",
  },
  texture: {
    label: "Texture",
    direction: "Higher means the surface looks smoother.",
    steady: "The surface looks even. Skip grit and scrubs.",
    mild: "A little roughness. A gentle smooth-out is plenty.",
    active: "Texture is uneven enough to feel in makeup. A mild resurfacing product fits.",
    priority: "Texture is rough in this photo. Go gentle and regular, not a harsh scrub.",
  },
  redness: {
    label: "Redness",
    direction: "Higher means less visible redness.",
    steady: "Redness is calm. You do not need a soothing gel for its own sake.",
    mild: "A little flush. Comforting formulas are a nicer fit than strong acids.",
    active: "Redness stands out. Choose calming products and pause strong acids.",
    priority: "Redness is high. Keep the routine short and soothing, and patch-test anything active.",
  },
  oiliness: {
    label: "Oil balance",
    direction: "Higher means less excess oil.",
    steady: "Shine looks balanced. A mattifying fluid would be overcorrecting.",
    mild: "Some shine through the day. A light balancer is enough.",
    active: "Oil is showing. A mattifying fluid fits better than a face oil.",
    priority: "The skin looks very oily here. Skip heavy oils and start with balance, not more moisture stacked on top.",
  },
  moisture: {
    label: "Hydration",
    direction: "Higher means the skin looks more hydrated.",
    steady: "Hydration looks comfortable. You can keep a simple cream, not add three.",
    mild: "A bit dry. A barrier cream is a sensible basic.",
    active: "The skin looks thirsty. Hydration should come before strong treatments.",
    priority: "Dryness is the priority. Repair the barrier before acids, retinoids, or mattifying toners.",
  },
  radiance: {
    label: "Radiance",
    direction: "Higher means more luminosity.",
    steady: "The skin already looks luminous. A face oil is a want, not a need.",
    mild: "A little dull, nothing dramatic. Consistency will do more than a highlight.",
    active: "The photo looks flat. Even-tone or hydrating products are a better match than shimmer.",
    priority: "Dullness is strong. Look at hydration and pigment first, not a sparkly oil.",
  },
  dark_circle: {
    label: "Dark circles",
    direction: "Higher means the under-eye looks lighter.",
    steady: "The under-eye looks even. An eye concentrate is optional.",
    mild: "Mild shadowing. A caffeine concentrate can help the look, not the sleep.",
    active: "Dark circles are clear in this photo. An eye product is a fair buy if that bothers you.",
    priority: "The under-eye is one of the lowest scores. Treat it on its own, not with a face acid.",
  },
  eye_bag: {
    label: "Eye bags",
    direction: "Higher means less puffiness.",
    steady: "Little puffiness. You can skip an eye cream unless you like the feel.",
    mild: "Slight fullness under the eye. Cooling and caffeine are the realistic tools.",
    active: "Puffiness shows. An eye concentrate matches this better than a face oil.",
    priority: "Under-eye puffiness is a main finding. Keep strong face treatments away from that skin.",
  },
  tear_trough: {
    label: "Under-eye groove",
    direction: "Higher means the groove under the eye looks softer.",
    steady: "The under-eye groove looks soft. No extra product needed for it.",
    mild: "A shallow groove. An eye concentrate can plump the look a little.",
    active: "The groove is visible. Eye care fits; a face retinoid does not belong there.",
    priority: "The under-eye groove is pronounced. Shop an eye product and leave the face acids on the cheeks.",
  },
  age_spot: {
    label: "Dark spots",
    direction: "Higher means fewer dark spots.",
    steady: "Spots are faint. A pigment serum would be prevention.",
    mild: "A few marks. Daily SPF matters more than a strong fade serum.",
    active: "Dark spots are visible. An even-tone serum is a direct match.",
    priority: "Pigment is a priority here. Fade products help only if you also keep the sun off them.",
  },
  firmness: {
    label: "Firmness",
    direction: "Higher means the skin looks firmer.",
    steady: "Firmness already scores well. Another firming cream is a duplicate.",
    mild: "Firmness is fine, with a little give. Maintenance is enough.",
    active: "The skin looks less firm. A peptide or slow retinoid-style serum is the match.",
    priority: "Firmness is low in this photo. Pick one treatment and stay with it.",
  },
};

export function isConcernId(value: string): value is ConcernId {
  return (CONCERN_IDS as readonly string[]).includes(value);
}

export function concernLabel(id: ConcernId): string {
  return COPY[id].label;
}

export function concernDirection(id: ConcernId): string {
  return COPY[id].direction;
}

export function scoreBand(score: number): Band {
  if (score >= 85) return "steady";
  if (score >= 75) return "mild";
  if (score >= 60) return "active";
  return "priority";
}

export function explainConcern(id: ConcernId, uiScore: number): string {
  return COPY[id][scoreBand(uiScore)];
}

export function bandLabel(score: number): string {
  switch (scoreBand(score)) {
    case "steady":
      return "Looking steady";
    case "mild":
      return "Mild";
    case "active":
      return "Worth treating";
    default:
      return "Priority";
  }
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(1, value));
}
