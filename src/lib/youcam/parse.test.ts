import { describe, expect, it } from "vitest";
import { buildMockScan, sampleBaselineScan } from "@/lib/youcam/mock";
import { parseYoucamResult } from "@/lib/youcam/parse";
import { buildSampleFollowUp, compareScans, productProgress } from "@/lib/progress";
import { getProduct } from "@/lib/catalog";
import { suitProduct } from "@/lib/suitability";

describe("YouCam result parsing", () => {
  it("drops moles and eyelid shape and keeps plain-language scores", () => {
    const scan = sampleBaselineScan();
    expect(scan.concerns.map((item) => item.id)).not.toContain("mole");
    expect(scan.filtered.map((item) => item.reason).sort()).toEqual(["eyelid", "mole"]);
    expect(scan.skinType).toBe("Combination");
    expect(scan.skinAge).toBe(37);
    expect(scan.overall).toBe(76);
    expect(scan.concerns[0].id).toBe("wrinkle");
    expect(scan.concerns[0].explanation.length).toBeGreaterThan(20);
    expect(scan.concerns.every((item) => item.uiScore >= 1 && item.uiScore <= 100)).toBe(true);
  });

  it("reads a nested score_info object when JSON output is missing", () => {
    const scan = parseYoucamResult({
      hd_acne: { whole: { raw_score: 59.9, ui_score: 76, output_mask_name: "hd_acne_output.png" } },
      mole: { raw_score: 10, ui_score: 10 },
      all: { score: 80 },
      skin_age: 41,
    });
    expect(scan.concerns).toHaveLength(1);
    expect(scan.concerns[0].rawScore).toBe(59.9);
    expect(scan.filtered).toEqual([{ key: "mole", reason: "mole" }]);
    expect(scan.skinAge).toBe(41);
    expect(scan.overall).toBe(80);
  });

  it("changes mock scores when the photo bytes change", () => {
    const first = buildMockScan(Buffer.from("photo-a"), { scenario: "auto", id: "a" });
    const second = buildMockScan(Buffer.from("photo-b-different"), { scenario: "auto", id: "b" });
    const same = buildMockScan(Buffer.from("photo-a"), { scenario: "auto", id: "c" });
    expect(first.concerns.map((item) => item.uiScore).join()).not.toBe(second.concerns.map((item) => item.uiScore).join());
    expect(first.concerns.map((item) => item.uiScore).join()).toBe(same.concerns.map((item) => item.uiScore).join());
  });
});

describe("shelf check and tracker", () => {
  const scan = sampleBaselineScan();

  it("matches a low score, patches a mild one, and skips a duplicate", () => {
    expect(suitProduct(getProduct("line-soft-serum")!, scan).verdict).toBe("suits");
    expect(suitProduct(getProduct("clear-breakout-gel")!, scan).verdict).toBe("patch-test");
    expect(suitProduct(getProduct("bounce-firming-cream")!, scan).verdict).toBe("skip");
    expect(suitProduct(getProduct("soft-lip-tint")!, null).verdict).toBe("suits");
    expect(suitProduct(getProduct("line-soft-serum")!, null).verdict).toBe("patch-test");
  });

  it("turns a sample follow-up into keep and switch", () => {
    const later = buildSampleFollowUp(scan);
    const deltas = compareScans(scan, later);
    expect(deltas.find((item) => item.id === "wrinkle")!.delta).toBeGreaterThanOrEqual(3);
    expect(deltas.find((item) => item.id === "acne")!.delta).toBeLessThanOrEqual(-3);
    expect(productProgress(getProduct("line-soft-serum")!, scan, later).verdict).toBe("keep");
    expect(productProgress(getProduct("clear-breakout-gel")!, scan, later).verdict).toBe("switch");
    expect(productProgress(getProduct("bounce-firming-cream")!, scan, later).verdict).toBe("patch-test");
    expect(productProgress(getProduct("soft-lip-tint")!, scan, later).verdict).toBe("keep");
    expect(productProgress(getProduct("line-soft-serum")!, scan, scan).verdict).toBe("patch-test");
  });
});
