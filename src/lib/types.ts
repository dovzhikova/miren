export const CONCERN_IDS = [
  "acne",
  "pore",
  "wrinkle",
  "texture",
  "redness",
  "oiliness",
  "moisture",
  "radiance",
  "dark_circle",
  "eye_bag",
  "tear_trough",
  "age_spot",
  "firmness",
] as const;

export type ConcernId = (typeof CONCERN_IDS)[number];

export type ConcernScore = {
  id: ConcernId;
  label: string;
  rawScore: number | null;
  uiScore: number;
  explanation: string;
  direction: string;
  maskUrl?: string;
};

export type FilteredFinding = {
  key: string;
  reason: "mole" | "eyelid";
};

export type Scan = {
  id: string;
  createdAt: string;
  source: "camera" | "upload" | "sample";
  mode: "mock" | "live";
  auth: "none" | "v2-api-key" | "v1-rsa";
  engine: string;
  overall: number;
  overallRaw: number | null;
  profile?: "hd" | "sd";
  skinAge: number | null;
  skinType: string | null;
  concerns: ConcernScore[];
  filtered: FilteredFinding[];
  previewDataUrl?: string;
};

export type SuitabilityVerdict = "suits" | "patch-test" | "skip";
export type ProgressVerdict = "observe" | "improved" | "declined" | "untracked";

export type Suitability = {
  verdict: SuitabilityVerdict;
  title: string;
  reasons: string[];
  /** Keyword warning. Shown as a note. It does not decide Skip. */
  warningNote?: string;
};

export type ProgressCall = {
  productId: string;
  verdict: ProgressVerdict;
  title: string;
  summary: string;
  delta: number | null;
};

export type ConcernDelta = {
  id: ConcernId;
  label: string;
  baselineRaw: number;
  latestRaw: number;
  delta: number;
  baselineUi: number;
  latestUi: number;
};

export type CartLine = {
  productId: string;
  qty: number;
};

export type RoutineItem = {
  productId: string;
  startedAt: string;
  baselineScanId: string;
};

export type AppState = {
  scans: Scan[];
  baselineId: string | null;
  cart: CartLine[];
  routine: RoutineItem[];
  /** Habit ids the shopper has started. A log, not a cause. */
  habitIds: string[];
  /** YYYY-MM-DD check-ins per habit. This week only, not a cause of a score change. */
  habitChecks: Record<string, string[]>;
  savedProductIds: string[];
};

export type TryOnKind = "makeup" | "simulation";

export type MakeupEffect = Record<string, unknown>;

export type Product = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  price: number;
  size: string;
  summary: string;
  howToUse: string;
  ingredients: string;
  /** Concerns with a catalog score of at least 0.6, or a keyword tag when no raw scores exist. */
  concerns: ConcernId[];
  /** Original 0–1 scores, mapped onto YouCam concern ids. */
  concernScores: Partial<Record<ConcernId, number>>;
  tracksSkin: boolean;
  /** Face products with concern data. Body, hair, and devices stay off the shelf. */
  forFace: boolean;
  /** Keyword flags from the description. Low confidence. Never a hard skip by themselves. */
  warnings: string[];
  category: string;
  /** Step in a short routine. Used to keep a shortlist from being eight serums. */
  routineRole: "cleanser" | "treatment" | "moisturizer" | "eye" | "spf" | "makeup" | "other";
  /** Colour finish for makeup. Skincare leaves this unset. */
  finish?: "matte" | "satin" | "cream" | "sheer";
  /** HTTPS image on the brand's own site. Absent until an official photo is mapped. */
  officialImageUrl?: string;
  inStock: boolean;
  skinTypes: string[];
  tryOn: {
    kind: TryOnKind;
    label: string;
    simulation?: Record<string, number>;
    effects?: MakeupEffect[];
  };
};
