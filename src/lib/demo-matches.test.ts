import { describe, expect, it } from "vitest";
import { getProduct } from "@/lib/catalog";
import { demoForYouMatches, demoMakeupMatches, demoVerdictExamples } from "@/lib/recommend";
import { buildSampleFollowUp, demoComparisonState, demoStoryFromScan, routineCalls } from "@/lib/progress";
import { suitProduct } from "@/lib/suitability";
import { sampleBaselineScan } from "@/lib/youcam/mock";

describe("demo match spread", () => {
  it("puts Suits you, Patch-test, and Skip on the sample For you list", () => {
    const scan = sampleBaselineScan();
    const list = demoForYouMatches(scan);
    const verdicts = new Set(list.map((product) => suitProduct(product, scan).verdict));
    expect(verdicts.has("suits")).toBe(true);
    expect(verdicts.has("patch-test")).toBe(true);
    expect(verdicts.has("skip")).toBe(true);
    const examples = demoVerdictExamples(scan);
    expect(examples.suits && examples.patch && examples.skip).toBeTruthy();
  });

  it("keeps a patch-test colour on the demo makeup list", () => {
    const scan = sampleBaselineScan();
    const makeup = demoMakeupMatches(scan);
    expect(makeup.some((product) => suitProduct(product, scan).verdict === "patch-test")).toBe(true);
    expect(makeup.every((product) => product.routineRole === "makeup")).toBe(true);
  });

  it("seeds routine with keep, switch or skip, patch-test, and a visible score delta", () => {
    const state = demoComparisonState();
    const baseline = state.scans.find((scan) => scan.id === state.baselineId)!;
    const latest = state.scans[0];
    expect(latest.engine).toBe("sample-follow-up");
    expect(latest.previewDataUrl).toBe("/demo/sample-face.jpg");
    const calls = routineCalls(state);
    expect(calls[0]?.verdict).toBe("improved");
    expect(calls.some((call) => call.title === "Too early to judge")).toBe(true);
    expect(calls.some((call) => call.summary.match(/does not establish what caused/i) || call.verdict === "improved")).toBe(true);
    const suits = calls.map((call) => suitProduct(getProduct(call.productId)!, baseline).verdict);
    expect(suits).toContain("suits");
    expect(suits).toContain("patch-test");
    expect(calls.some((call) => call.verdict === "declined") || suits.includes("skip")).toBe(true);
    const again = demoStoryFromScan(baseline);
    expect(again.scans[0].id).not.toBe(again.baselineId);
    expect(Date.parse(again.scans[0].createdAt)).toBeGreaterThan(Date.parse(baseline.createdAt));
    expect(buildSampleFollowUp(baseline).mode).toBe("mock");
  });
});
