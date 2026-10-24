import { describe, expect, it } from "vitest";
import { listFaceProducts, listMakeupProducts } from "@/lib/catalog";
import { sampleBaselineScan } from "@/lib/youcam/mock";
import { buildSampleFollowUp, compareScans, comparisonIssue, productProgress, routineCalls } from "@/lib/progress";
import { newState } from "@/lib/state";
import type { Scan } from "@/lib/types";

const demo = sampleBaselineScan();
const baseline: Scan = { ...demo, id: "real-first", mode: "live", source: "camera", auth: "v2-api-key", engine: "youcam-skin-analysis-v2.1", profile: "hd" };
const product = { ...listFaceProducts()[0], concerns: ["wrinkle" as const], tracksSkin: true };
function later(delta: number, days = 21): Scan {
  return { ...baseline, id: "real-second", createdAt: new Date(Date.parse(baseline.createdAt) + days * 86_400_000).toISOString(), concerns: baseline.concerns.map((row) => ({ ...row, rawScore: row.rawScore! + delta, uiScore: row.uiScore - delta })) };
}

describe("progress evidence", () => {
  it.each([-6, 6])("does not decide effectiveness after a one-minute %s-point change", (delta) => {
    const call = productProgress(product, baseline, later(delta, 1 / 1440));
    expect(call.verdict).toBe("observe");
    expect(call.delta).toBeNull();
    expect(call.summary).not.toMatch(/stop this|switch|stay with it/i);
  });
  it("uses the product start date even when its baseline is older", () => {
    expect(productProgress(product, baseline, later(8), later(0, 20).createdAt).verdict).toBe("observe");
  });
  it("reports raw changes even when UI scores move in the opposite direction", () => {
    const call = productProgress(product, baseline, later(6));
    expect(call.verdict).toBe("improved");
    expect(call.delta).toBe(6);
    expect(call.summary).toContain("does not establish what caused");
    expect(compareScans(baseline, later(6))[0].delta).toBe(6);
  });
  it("describes declines without telling the shopper to stop a product", () => {
    const call = productProgress(product, baseline, later(-6));
    expect(call.verdict).toBe("declined");
    expect(call.summary).not.toMatch(/stop|switch|pick a different/i);
  });
  it("does not substitute missing raw scores", () => {
    const next = { ...later(8), concerns: later(8).concerns.map((row) => ({ ...row, rawScore: null })) };
    expect(compareScans(baseline, next)).toEqual([]);
    expect(productProgress(product, baseline, next).verdict).toBe("observe");
  });
  it.each([
    { mode: "mock", engine: "sample-follow-up" },
    { profile: "sd" },
    { profile: undefined },
    { engine: "different-model" },
    { createdAt: "not-a-date" },
    { createdAt: "2020-01-01T00:00:00Z" },
  ] as Partial<Scan>[]) ("rejects incompatible or invalid scans: %j", (patch) => {
    const next = { ...later(8), ...patch };
    expect(comparisonIssue(baseline, next)).toBeTruthy();
    expect(compareScans(baseline, next)).toEqual([]);
    expect(productProgress(product, baseline, next).verdict).toBe("observe");
  });
  it("keeps makeup out of skin effectiveness tracking", () => {
    for (const makeup of listMakeupProducts()) {
      expect(makeup.tracksSkin).toBe(false);
      expect(productProgress(makeup, baseline, later(-6)).verdict).toBe("untracked");
    }
  });
  it("does not replace a lost product baseline with another scan", () => {
    const state = { ...newState(), scans: [later(8), baseline], baselineId: baseline.id, routine: [{ productId: product.slug, startedAt: baseline.createdAt, baselineScanId: "missing" }] };
    expect(routineCalls(state)[0].title).toBe("Starting scan unavailable");
  });
});

describe("synthetic follow-ups", () => {
  it("refuses to generate one from a personal scan", () => {
    expect(() => buildSampleFollowUp(baseline)).toThrow("Demo data");
  });
  it("marks every generated result as demo and removes masks from the source", () => {
    const scan = buildSampleFollowUp(demo);
    expect(scan.mode).toBe("mock");
    expect(scan.auth).toBe("none");
    expect(scan.source).toBe("sample");
    expect(scan.engine).toBe("sample-follow-up");
    expect(scan.concerns.every((row) => row.maskUrl == null)).toBe(true);
    expect(Date.parse(scan.createdAt) - Date.parse(demo.createdAt)).toBe(21 * 86_400_000);
  });
});
