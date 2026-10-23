import type { ConcernId, ConcernScore, Scan } from "@/lib/types";

/**
 * Beyond the shelf. Each habit is a cosmetic note tied to YouCam concerns
 * and, where it matters, skin type. Nothing here diagnoses or treats disease.
 *
 * Screen blue light is intentionally absent. Daylight is the exposure with
 * evidence behind it. Phone and laptop screens have not been shown to age
 * skin in a way that compares with the sun (AAD sun-protection guidance).
 */

export const HABIT_CATEGORIES = ["lifestyle", "diet", "supplements", "sleep", "other"] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export type EvidenceLevel = "low" | "moderate" | "strong";

export type SkinTypeKey = "dry" | "oily" | "combination" | "normal" | "sensitive";

export type Habit = {
  id: string;
  category: HabitCategory;
  title: string;
  why: string;
  evidence: EvidenceLevel;
  source: string;
  href: string;
  concerns: ConcernId[];
  skinTypes?: SkinTypeKey[];
  /** Oral product. The UI adds the clinician caution. */
  supplement?: boolean;
};

export type RankedHabit = {
  habit: Habit;
  score: number;
};

export type ClinicianFlag = {
  id: "acne" | "redness" | "age_spot";
  title: string;
  body: string;
};

export const HABIT_DISCLAIMER =
  "Not medical advice. These are general notes from public guidance, matched to this photo. They do not diagnose a skin condition.";

export const SUPPLEMENT_CAUTION =
  "Talk to a doctor or pharmacist before you start this, especially if you are pregnant, trying, breastfeeding, or on medication.";

export const CATEGORY_LABEL: Record<HabitCategory, string> = {
  lifestyle: "Lifestyle",
  diet: "Diet",
  supplements: "Supplements",
  sleep: "Sleep",
  other: "Other habits",
};

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  strong: "Strong evidence",
  moderate: "Moderate evidence",
  low: "Low evidence",
};

const ACTIVE_BELOW = 85;
const SEVERE_BELOW = 60;

export const HABITS: Habit[] = [
  {
    id: "spf",
    category: "lifestyle",
    title: "Wear SPF 30 every morning",
    why: "Daylight is the exposure most clearly tied to lines, dark spots, redness, and a duller look. A broad-spectrum SPF 30, put on every morning and reapplied when you are outside, is the habit with the strongest record. A serum does not replace it.",
    evidence: "strong",
    source: "American Academy of Dermatology. Sunscreen and shade.",
    href: "https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen",
    concerns: ["wrinkle", "age_spot", "redness", "radiance"],
  },
  {
    id: "smoking",
    category: "lifestyle",
    title: "If you smoke, stopping helps the skin",
    why: "Smoking is linked with deeper lines and a duller, less even surface. Stopping does more for that look than another jar. If you do not smoke, ignore this one.",
    evidence: "strong",
    source: "American Academy of Dermatology. How to prevent premature skin aging. Kadunce DP et al. Cigarette smoking: risk factor for premature facial wrinkling. Ann Intern Med. 1991.",
    href: "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/reduce-premature-aging-skin",
    concerns: ["wrinkle", "radiance", "texture"],
  },
  {
    id: "stress",
    category: "lifestyle",
    title: "Shrink the stressful weeks",
    why: "Stress does not explain every breakout or every flush. A study of students did find acne flared around exams. In a rough week, a shorter routine and sleep beat adding three new products.",
    evidence: "moderate",
    source: "Chiu A, Chon SY, Kimball AB. The response of skin disease to stress. Arch Dermatol. 2003.",
    href: "https://pubmed.ncbi.nlm.nih.gov/12873885/",
    concerns: ["acne", "redness"],
  },
  {
    id: "face-contact",
    category: "lifestyle",
    title: "Keep hands, hair, and fabric off the skin",
    why: "Dermatology guidance tells people with breakouts to stop touching the face through the day, and to keep oily hair off the forehead. A clean pillowcase and a wiped phone are the same idea, less oil against the skin, and they are less directly studied.",
    evidence: "moderate",
    source: "American Academy of Dermatology. Acne: tips for managing.",
    href: "https://www.aad.org/public/diseases/acne/skin-care/tips",
    concerns: ["acne", "pore"],
  },
  {
    id: "exercise",
    category: "lifestyle",
    title: "Rinse after you sweat",
    why: "Exercise itself is not a skin treatment. Sitting in sweat can aggravate breakouts and shine. Rinse with a gentle cleanser afterwards, then moisturise. Skip a harsh scrub.",
    evidence: "moderate",
    source: "American Academy of Dermatology. Acne skin-care tips.",
    href: "https://www.aad.org/public/diseases/acne/skin-care/tips",
    concerns: ["acne", "oiliness", "radiance"],
  },
  {
    id: "low-glycemic",
    category: "diet",
    title: "Fewer blood-sugar spikes",
    why: "A lower-glycemic pattern, with fewer sugary drinks and white-flour spikes, reduced acne in a randomized trial. It is a way of eating, not a ban on one food, and it will not clear skin on its own.",
    evidence: "moderate",
    source: "Smith RN et al. A low-glycemic-load diet improves symptoms in acne vulgaris. Am J Clin Nutr. 2007. Also summarized by the American Academy of Dermatology.",
    href: "https://www.aad.org/public/diseases/acne/causes/diet",
    concerns: ["acne"],
  },
  {
    id: "dairy",
    category: "diet",
    title: "A short trial without milk, only if breakouts lead",
    why: "Some studies link milk, skim milk in particular, with more acne. The reason is unclear, and yogurt and cheese are less consistent. Worth a few weeks only when breakouts are the issue. It is an association, not a rule for every diet.",
    evidence: "low",
    source: "American Academy of Dermatology. Can the right diet get rid of acne?",
    href: "https://www.aad.org/public/diseases/acne/causes/diet",
    concerns: ["acne"],
  },
  {
    id: "omega-food",
    category: "diet",
    title: "Oily fish a couple of times a week",
    why: "Omega-3 fats from food are a reasonable part of meals. Small trials, mostly of capsules, looked at acne and dryness. The effect is modest. Eat the fish if you like it. A meal is not a skin treatment.",
    evidence: "low",
    source: "Jung JY et al. Dietary supplementation with omega-3 and gamma-linolenic acid in acne. Acta Derm Venereol. 2014.",
    href: "https://www.medicaljournals.se/acta/content/abstract/10.2340/00015555-1802",
    concerns: ["acne", "redness", "moisture"],
  },
  {
    id: "water",
    category: "diet",
    title: "Drink to thirst, then moisturise",
    why: "Being genuinely short of fluid is not good for you. Drinking past thirst has weak evidence for how skin looks. For a tight, dry feel, a moisturiser on damp skin does more than another litre of water.",
    evidence: "low",
    source: "American Academy of Dermatology. Dry skin: tips for managing.",
    href: "https://www.aad.org/public/diseases/a-z/dry-skin-treatment",
    concerns: ["moisture"],
  },
  {
    id: "antioxidant-foods",
    category: "diet",
    title: "Fruit, vegetables, and regular meals",
    why: "People who eat more fruit and vegetables tend to show healthier-looking skin in observational research. That is a pattern, not a food that fades a spot. It will not outrun daylight or a stripped barrier.",
    evidence: "low",
    source: "American Academy of Dermatology. Diet and acne, on the limits of food claims. Skin-aging diet research is mostly observational.",
    href: "https://www.aad.org/public/diseases/acne/causes/diet",
    concerns: ["radiance", "texture", "age_spot"],
  },
  {
    id: "zinc",
    category: "supplements",
    title: "Zinc, only with a clinician",
    why: "Oral zinc has a modest record in acne reviews. Doses in studies are easy to overshoot, and zinc interferes with some medicines. This is not a reason to start a bottle from a photo.",
    evidence: "moderate",
    source: "Yee BE et al. Serum zinc levels and efficacy of zinc treatment in acne vulgaris: a systematic review and meta-analysis. Dermatol Ther. 2020.",
    href: "https://pubmed.ncbi.nlm.nih.gov/32860489/",
    concerns: ["acne"],
    supplement: true,
  },
  {
    id: "omega-supplement",
    category: "supplements",
    title: "An omega-3 capsule is optional",
    why: "A small trial of omega-3 capsules reported fewer acne lesions. The evidence is limited, and food is the simpler first step. A capsule is not a treatment, and it is the wrong experiment if you are pregnant or on blood thinners unless a clinician agrees.",
    evidence: "low",
    source: "Jung JY et al. Acta Derm Venereol. 2014.",
    href: "https://www.medicaljournals.se/acta/content/abstract/10.2340/00015555-1802",
    concerns: ["acne", "redness"],
    supplement: true,
  },
  {
    id: "collagen",
    category: "supplements",
    title: "Collagen peptides, modest at best",
    why: "Reviews of hydrolyzed collagen find a small improvement in hydration and elasticity over 8 to 12 weeks. Trials are often short and industry-funded. Expect a modest change, if any, not a lift.",
    evidence: "low",
    source: "Choi FD et al. Oral collagen supplementation: a systematic review of dermatological applications. J Drugs Dermatol. 2019.",
    href: "https://jddonline.com/articles/oral-collagen-supplementation-a-systematic-review-of-dermatological-applications-S1545961619P0009X/",
    concerns: ["wrinkle", "firmness", "moisture"],
    supplement: true,
  },
  {
    id: "sleep-duration",
    category: "sleep",
    title: "Protect a full night",
    why: "Poor sleep is associated with a more tired look, including under the eyes, and with a weaker barrier the next day. Aim for a regular 7 to 9 hours. One early night will not erase circles.",
    evidence: "moderate",
    source: "Oyetakin-White P et al. Does poor sleep quality affect skin ageing? Clin Exp Dermatol. 2015. NHS recommends 7 to 9 hours for adults.",
    href: "https://www.nhs.uk/every-mind-matters/mental-health-issues/sleep/",
    concerns: ["dark_circle", "eye_bag", "tear_trough", "radiance"],
  },
  {
    id: "sleep-position",
    category: "sleep",
    title: "Stay off the creased side",
    why: "Hours with your face pressed into a pillow fold the same lines and can leave puffiness under the eyes by morning. Sleeping more on your back, or at least switching sides, is the mechanical fix. It is a habit, not a promise.",
    evidence: "moderate",
    source: "Anson G, Kane MAC, Lambros V. Sleep wrinkles: facial aging and facial distortion during sleep. Aesthet Surg J. 2016.",
    href: "https://pubmed.ncbi.nlm.nih.gov/27329660/",
    concerns: ["wrinkle", "eye_bag", "tear_trough"],
  },
  {
    id: "sleep-timing",
    category: "sleep",
    title: "Keep the same sleep window",
    why: "The skin barrier follows a day-night rhythm, and a drifting bedtime makes the night shorter than it looks. A steady window is the practical piece. Evidence that a particular clock time changes a cosmetic score is weak.",
    evidence: "low",
    source: "NHS sleep guidance. Day-night skin-barrier research is real; a specific bedtime for wrinkles is not established.",
    href: "https://www.nhs.uk/every-mind-matters/mental-health-issues/sleep/",
    concerns: ["moisture", "dark_circle"],
  },
  {
    id: "gentle-cleanse",
    category: "other",
    title: "Cleanse gently, twice a day",
    why: "A mild cleanser, lukewarm water, and hands rather than a scratchy cloth is the routine dermatology guidance describes. Twice a day is enough for most faces. More washing often means more dryness and more oil rebound.",
    evidence: "moderate",
    source: "American Academy of Dermatology. Face washing 101.",
    href: "https://www.aad.org/public/everyday-care/skin-care-basics/care/face-washing-101",
    concerns: ["acne", "oiliness", "pore", "moisture"],
  },
  {
    id: "not-over-exfoliating",
    category: "other",
    title: "Do not scrub the score away",
    why: "Grit, daily acids, and a rough cloth make texture, redness, and dryness look worse, and they pick at breakouts. If you exfoliate, keep it mild and not every day. Stop when skin stings or flakes.",
    evidence: "moderate",
    source: "American Academy of Dermatology. How to safely exfoliate at home.",
    href: "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    concerns: ["texture", "redness", "moisture", "acne"],
  },
  {
    id: "alcohol",
    category: "other",
    title: "Notice flushing after drinks",
    why: "Alcohol is a known flush trigger for people whose redness comes and goes. It is not the cause of every red face, and cutting it will not fix a score by itself. If a drink reliably brings a flush, that is the useful observation.",
    evidence: "moderate",
    source: "NHS. Rosacea triggers, including alcohol.",
    href: "https://www.nhs.uk/conditions/rosacea/",
    concerns: ["redness"],
  },
  {
    id: "dry-moisturise",
    category: "other",
    title: "Moisturise while skin is still damp",
    why: "Dry skin loses water faster. A plain moisturiser on damp skin, used every day, is the step guidance puts ahead of oils, long hot showers, and scrubs.",
    evidence: "moderate",
    source: "American Academy of Dermatology. Dry skin: tips for managing.",
    href: "https://www.aad.org/public/diseases/a-z/dry-skin-treatment",
    concerns: ["moisture"],
    skinTypes: ["dry"],
  },
  {
    id: "oily-gentle",
    category: "other",
    title: "Do not strip oily skin",
    why: "A harsh cleanse can leave oily skin tighter for an hour and shinier later. Use a gentle cleanser, keep a light moisturiser, and save strong mattifiers for the shiny zones.",
    evidence: "moderate",
    source: "American Academy of Dermatology. Face washing 101.",
    href: "https://www.aad.org/public/everyday-care/skin-care-basics/care/face-washing-101",
    concerns: ["oiliness", "pore"],
    skinTypes: ["oily"],
  },
  {
    id: "combination-zones",
    category: "other",
    title: "Treat the dry zones and the oily zone apart",
    why: "Combination skin is two problems on one face. A rich cream on the oily panel, or a mattifying toner on the dry cheeks, usually overshoots. Moisturise the dry parts. Keep the T-zone lighter.",
    evidence: "moderate",
    source: "American Academy of Dermatology. Face washing and dry-skin guidance, applied by zone.",
    href: "https://www.aad.org/public/everyday-care/skin-care-basics/care/face-washing-101",
    concerns: ["oiliness", "moisture"],
    skinTypes: ["combination"],
  },
  {
    id: "sensitive-short",
    category: "other",
    title: "Keep a short, boring routine",
    why: "Sensitive skin tolerates fewer new products at once. Fragrance-heavy formulas and a stack of acids are the usual reason a face stings. One new product at a time, on a small patch first.",
    evidence: "moderate",
    source: "American Academy of Dermatology. Face washing 101, on gentle products.",
    href: "https://www.aad.org/public/everyday-care/skin-care-basics/care/face-washing-101",
    concerns: ["redness"],
    skinTypes: ["sensitive"],
  },
];

const EVIDENCE_BONUS: Record<EvidenceLevel, number> = {
  strong: 6,
  moderate: 3,
  low: 0,
};

export function normalizeSkinType(value: string | null | undefined): SkinTypeKey | null {
  if (!value) return null;
  const text = value.toLowerCase();
  if (text.includes("combin")) return "combination";
  if (text.includes("sensit")) return "sensitive";
  if (text.includes("oil")) return "oily";
  if (text.includes("dry")) return "dry";
  if (text.includes("normal")) return "normal";
  return null;
}

function concernGap(uiScore: number): number {
  if (uiScore >= ACTIVE_BELOW) return 0;
  return ACTIVE_BELOW - uiScore;
}

export function habitRelevance(habit: Habit, scan: Scan): number {
  const gaps = habit.concerns
    .map((id) => scan.concerns.find((item) => item.id === id))
    .filter((item): item is ConcernScore => Boolean(item))
    .map((item) => concernGap(item.uiScore))
    .filter((gap) => gap > 0)
    .sort((left, right) => right - left);

  const skinType = normalizeSkinType(scan.skinType);
  if (habit.skinTypes?.length && (!skinType || !habit.skinTypes.includes(skinType))) return 0;

  let score = 0;
  if (gaps.length) {
    score = gaps[0] + gaps.slice(1).reduce((sum, gap) => sum + gap * 0.25, 0);
  }
  if (skinType && habit.skinTypes?.includes(skinType)) {
    score += habit.concerns.length ? 4 : 16;
  }

  // Sunscreen stays on the list even when this photo looks calm.
  if (habit.id === "spf" && score === 0) score = 1;
  if (score > 0) score += EVIDENCE_BONUS[habit.evidence];
  return score;
}

export function rankHabits(scan: Scan): RankedHabit[] {
  return HABITS.map((habit) => ({ habit, score: habitRelevance(habit, scan) }))
    .filter((row) => row.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        EVIDENCE_BONUS[right.habit.evidence] - EVIDENCE_BONUS[left.habit.evidence] ||
        left.habit.id.localeCompare(right.habit.id),
    );
}

/** Highest-scoring habits, spread across categories when the scores are close. */
export function topHabits(scan: Scan, count = 3): RankedHabit[] {
  const ranked = rankHabits(scan);
  const picked: RankedHabit[] = [];
  const used = new Set<HabitCategory>();
  for (const row of ranked) {
    if (picked.length >= count) break;
    if (used.has(row.habit.category)) continue;
    picked.push(row);
    used.add(row.habit.category);
  }
  for (const row of ranked) {
    if (picked.length >= count) break;
    if (picked.some((item) => item.habit.id === row.habit.id)) continue;
    picked.push(row);
  }
  return picked;
}

export function habitsByCategory(scan: Scan): Array<{ category: HabitCategory; items: RankedHabit[] }> {
  const ranked = rankHabits(scan);
  return HABIT_CATEGORIES.map((category) => ({
    category,
    items: ranked.filter((row) => row.habit.category === category),
  })).filter((group) => group.items.length > 0);
}

export function matchedConcerns(habit: Habit, scan: Scan): ConcernScore[] {
  return scan.concerns.filter((item) => habit.concerns.includes(item.id) && item.uiScore < ACTIVE_BELOW);
}

export function clinicianFlags(scan: Scan): ClinicianFlag[] {
  const flags: ClinicianFlag[] = [];
  const score = (id: ConcernId) => scan.concerns.find((item) => item.id === id)?.uiScore;
  const acne = score("acne");
  if (acne != null && acne < SEVERE_BELOW) {
    flags.push({
      id: "acne",
      title: "See a dermatologist about these breakouts",
      body: "Breakouts are loud on this photo. A cleanser and a habit list are not a plan for deep, painful, or scarring acne. A dermatologist can look at the skin itself.",
    });
  }
  const redness = score("redness");
  if (redness != null && redness < SEVERE_BELOW) {
    flags.push({
      id: "redness",
      title: "See a dermatologist if the redness stays",
      body: "Redness is strong in this photo. A score cannot name the cause. See a dermatologist if it stings, spreads, or does not settle. Do not cover it with a pile of new acids.",
    });
  }
  const spots = score("age_spot");
  if (spots != null && spots < SEVERE_BELOW) {
    flags.push({
      id: "age_spot",
      title: "See a dermatologist about a changing spot",
      body: "Dark spots are very visible here. A photo score cannot tell a sun spot from a mark that should be examined. See a dermatologist for anything changing, bleeding, itching, or irregular.",
    });
  }
  return flags;
}
