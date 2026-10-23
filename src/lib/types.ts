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
  rawScore: number;
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
  overallRaw: number;
  skinAge: number | null;
  skinType: string | null;
  concerns: ConcernScore[];
  filtered: FilteredFinding[];
  previewDataUrl?: string;
};

export type SuitabilityVerdict = "suits" | "patch-test" | "skip";
export type ProgressVerdict = "keep" | "patch-test" | "switch";

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
  /** Habit ids the shopper checked on the follow-up. A log, not a cause. */
  habitIds: string[];
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
  inStock: boolean;
  skinTypes: string[];
  tryOn: {
    kind: TryOnKind;
    label: string;
    simulation?: Record<string, number>;
    effects?: MakeupEffect[];
  };
};
