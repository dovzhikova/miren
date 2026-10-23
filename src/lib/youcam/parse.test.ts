import { describe, expect, it } from "vitest";
import { buildMockScan, sampleBaselineScan } from "@/lib/youcam/mock";
import { parseYoucamResult } from "@/lib/youcam/parse";
import { buildSampleFollowUp, compareScans, productProgress } from "@/lib/progress";
import { getProduct, listFaceProducts } from "@/lib/catalog";
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
    const face = listFaceProducts();
    const wrinkle = face.find((product) => (product.concernScores.wrinkle ?? 0) >= 0.85 && (product.concernScores.acne ?? 0) < 0.6);
    expect(wrinkle).toBeTruthy();
    expect(suitProduct(wrinkle!, scan).verdict).toBe("suits");
    const mild = { ...wrinkle!, concerns: ["acne" as const], concernScores: { acne: 0.8 }, warnings: ["irritation possible"] };
    expect(suitProduct(mild, scan).verdict).toBe("patch-test");
    const steady = { ...wrinkle!, concerns: ["firmness" as const], concernScores: { firmness: 0.9 }, warnings: [] };
    expect(suitProduct(steady, scan).verdict).toBe("skip");
    expect(suitProduct(wrinkle!, null).verdict).toBe("patch-test");
    expect(getProduct(wrinkle!.slug)?.name).toBe(wrinkle!.name);
  });

  it("turns a sample follow-up into keep and switch", () => {
    const later = buildSampleFollowUp(scan);
    const deltas = compareScans(scan, later);
    expect(deltas.find((item) => item.id === "wrinkle")!.delta).toBeGreaterThanOrEqual(3);
    expect(deltas.find((item) => item.id === "acne")!.delta).toBeLessThanOrEqual(-3);
    const base = listFaceProducts()[0];
    expect(productProgress({ ...base, concerns: ["wrinkle", "pore"], tracksSkin: true }, scan, later).verdict).toBe("keep");
    expect(productProgress({ ...base, concerns: ["acne"], tracksSkin: true }, scan, later).verdict).toBe("switch");
    expect(productProgress({ ...base, concerns: ["firmness"], tracksSkin: true }, scan, later).verdict).toBe("patch-test");
    expect(productProgress({ ...base, tracksSkin: false }, scan, later).verdict).toBe("keep");
    expect(productProgress({ ...base, concerns: ["wrinkle"], tracksSkin: true }, scan, scan).verdict).toBe("patch-test");
  });
});
