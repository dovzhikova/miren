import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SHELF_COUNT, listProducts } from "@/lib/catalog";
import { DEMO_PREVIEW_CAPTION, DEMO_FIXTURES, DISAMBIGUATION, honestyPoints, demoFixturePath } from "@/lib/honesty";
import { DEMO_RAW_MOVE, productProgress, routineOutcomeLabel } from "@/lib/progress";
import { YOUCAM_APIS } from "@/lib/youcam/apis";
import { sampleBaselineScan } from "@/lib/youcam/mock";
import type { Scan } from "@/lib/types";

describe("honesty copy", () => {
  it("names the three YouCam APIs and the shelf size without a medical claim", () => {
    expect([...YOUCAM_APIS]).toEqual(["AI Skin Analysis v2.1", "AI Makeup Virtual Try-On", "AI Skin Simulation"]);
    expect(SHELF_COUNT).toBe(listProducts().length);
    expect(SHELF_COUNT).toBeGreaterThan(170);
    const points = honestyPoints().join(" ");
    for (const api of YOUCAM_APIS) expect(points).toContain(api);
    expect(points).toContain(`${SHELF_COUNT}-product shelf`);
    expect(points).toContain(`±${DEMO_RAW_MOVE}`);
    expect(points).toMatch(/not proven efficacy/i);
    expect(points).toMatch(/too early to judge/i);
    expect(points).toMatch(/causation is unknown/i);
    expect(points).toMatch(/not a medical diagnosis/i);
    expect(points).toContain("6760979781");
    expect(points).toMatch(/moles and eyelid/i);
    expect(points).toMatch(/women in tech/i);
    expect(DISAMBIGUATION).toContain("GlowCheck AI");
  });

  it("ships labeled demo preview fixtures that are not the untouched sample", () => {
    expect(demoFixturePath("makeup")).toBe(DEMO_FIXTURES.makeup);
    expect(demoFixturePath("simulation")).toBe(DEMO_FIXTURES.simulation);
    expect(DEMO_PREVIEW_CAPTION).toMatch(/YouCam was not called/);
    for (const file of Object.values(DEMO_FIXTURES)) {
      const path = `public${file}`;
      expect(existsSync(path), path).toBe(true);
    }
  });

  it("calls a one-minute change too early and keeps causation unknown", () => {
    const baseline = { ...sampleBaselineScan(), id: "real-first", mode: "live" as const, source: "camera" as const, auth: "v2-api-key" as const, engine: "youcam-skin-analysis-v2.1", profile: "hd" as const };
    const latest: Scan = { ...baseline, id: "real-second", createdAt: new Date(Date.parse(baseline.createdAt) + 60_000).toISOString() };
    const call = productProgress({ ...listProducts()[0], concerns: ["wrinkle"], tracksSkin: true }, baseline, latest);
    expect(call.verdict).toBe("observe");
    expect(call.title).toBe("Too early to judge");
    expect(routineOutcomeLabel(call)).toBe("Too early to judge");
    expect(call.summary).toMatch(/cause is unknown/i);
    expect(call.summary).toMatch(/does not establish what caused/i);
    expect(routineOutcomeLabel({ ...call, verdict: "improved", title: "Scores improved" })).toBe("Keep");
    expect(routineOutcomeLabel({ ...call, verdict: "declined", title: "Scores declined" })).toBe("Switch");
  });
});
