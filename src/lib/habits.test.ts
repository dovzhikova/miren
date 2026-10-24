import { describe, expect, it } from "vitest";
import { CONCERN_IDS, type ConcernId, type Scan } from "@/lib/types";
import { sampleBaselineScan } from "@/lib/youcam/mock";
import {
  HABITS,
  clinicianFlags,
  habitAction,
  habitRelevance,
  habitStreak,
  normalizeSkinType,
  rankHabits,
  topHabits,
  weekDates,
} from "@/lib/habits";

function scan(scores: Partial<Record<ConcernId, number>>, skinType: string | null = null): Scan {
  return {
    id: "test",
    createdAt: "2026-01-01T00:00:00.000Z",
    source: "sample",
    mode: "mock",
    auth: "none",
    engine: "test",
    overall: 70,
    overallRaw: 60,
    skinAge: null,
    skinType,
    filtered: [],
    concerns: CONCERN_IDS.map((id) => ({
      id,
      label: id,
      rawScore: scores[id] ?? 90,
      uiScore: scores[id] ?? 90,
      explanation: "Test score.",
      direction: "Higher means healthier-looking.",
    })),
  };
}

describe("concern to habit mapping", () => {
  it("covers every YouCam concern and cites a source", () => {
    for (const id of CONCERN_IDS) {
      expect(HABITS.some((habit) => habit.concerns.includes(id))).toBe(true);
    }
    for (const habit of HABITS) {
      expect(habit.why.length).toBeGreaterThan(40);
      expect(habit.source.length).toBeGreaterThan(12);
      expect(habit.href.startsWith("https://")).toBe(true);
      expect(["low", "moderate", "strong"]).toContain(habit.evidence);
    }
    expect(new Set(HABITS.map((habit) => habit.id)).size).toBe(HABITS.length);
  });

  it("does not recommend cutting screen blue light", () => {
    const text = HABITS.map((habit) => `${habit.id} ${habit.title} ${habit.why}`).join("\n");
    expect(text).not.toMatch(/blue light|screen time|phone screen/i);
  });

  it("marks only the supplement habits and keeps their evidence modest", () => {
    const supplements = HABITS.filter((habit) => habit.category === "supplements");
    expect(supplements.map((habit) => habit.id).sort()).toEqual(["collagen", "omega-supplement", "zinc"]);
    expect(supplements.every((habit) => habit.supplement)).toBe(true);
    expect(HABITS.filter((habit) => habit.supplement).every((habit) => habit.category === "supplements")).toBe(true);
    expect(supplements.find((habit) => habit.id === "collagen")?.evidence).toBe("low");
    expect(supplements.find((habit) => habit.id === "zinc")?.evidence).toBe("moderate");
  });

  it("ranks the sample scan toward sunscreen, cleansing, and sleep position", () => {
    const top = topHabits(sampleBaselineScan());
    expect(top.map((row) => row.habit.id)).toEqual(["spf", "gentle-cleanse", "sleep-position"]);
    expect(new Set(top.map((row) => row.habit.category)).size).toBe(3);
    expect(top.map((row) => row.habit.id)).not.toContain("zinc");
  });

  it("keeps sunscreen on a calm scan and drops unrelated acne habits", () => {
    const calm = scan({});
    const ids = rankHabits(calm).map((row) => row.habit.id);
    expect(ids).toContain("spf");
    expect(ids).not.toContain("low-glycemic");
    expect(ids).not.toContain("zinc");
    expect(habitRelevance(HABITS.find((habit) => habit.id === "spf")!, calm)).toBeGreaterThan(0);
  });

  it("uses skin type without inventing a type the scan did not report", () => {
    expect(normalizeSkinType("Combination")).toBe("combination");
    expect(normalizeSkinType("Very oily")).toBe("oily");
    expect(normalizeSkinType(null)).toBeNull();
    const combination = rankHabits(scan({ oiliness: 70, moisture: 68 }, "Combination")).map((row) => row.habit.id);
    expect(combination).toContain("combination-zones");
    expect(combination).not.toContain("oily-gentle");
    expect(combination).not.toContain("dry-moisturise");
    const dry = rankHabits(scan({ moisture: 60 }, "Dry")).map((row) => row.habit.id);
    expect(dry).toContain("dry-moisturise");
    expect(dry).not.toContain("combination-zones");
  });

  it("flags a dermatologist only for severe acne, redness, or age spots", () => {
    expect(clinicianFlags(sampleBaselineScan())).toEqual([]);
    const severe = scan({ acne: 42, redness: 48, age_spot: 51 });
    expect(clinicianFlags(severe).map((flag) => flag.id)).toEqual(["acne", "redness", "age_spot"]);
    for (const flag of clinicianFlags(severe)) {
      expect(flag.body).toMatch(/dermatologist/i);
      expect(flag.body).not.toMatch(/diagnos/i);
    }
    expect(clinicianFlags(scan({ acne: 70, redness: 70, age_spot: 70 }))).toEqual([]);
    expect(rankHabits(severe).map((row) => row.habit.id)).toContain("zinc");
  });

  it("does not make treatment or diagnosis claims in the habit copy", () => {
    const text = HABITS.map((habit) => `${habit.why} ${habitAction(habit)}`).join("\n");
    expect(text).not.toMatch(/diagnos|cure|cancer|prescription/i);
  });

  it("gives every habit a short action and a Monday week", () => {
    for (const habit of HABITS) {
      const action = habitAction(habit);
      expect(action.length).toBeGreaterThan(12);
      expect(action.length).toBeLessThan(110);
    }
    expect(weekDates("2026-10-24")).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(habitStreak(["2026-10-22", "2026-10-23", "2026-10-24"], "2026-10-24")).toBe(3);
    expect(habitStreak(["2026-10-22", "2026-10-23"], "2026-10-24")).toBe(2);
    expect(habitStreak(["2026-10-20"], "2026-10-24")).toBe(0);
  });
});
