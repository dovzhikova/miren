import { describe, expect, it } from "vitest";
import rawCatalog from "@/data/products.json";
import { CONCERN_SCORE_MIN, concernScoresFromRaw, formatPrice, isAllowedOfficialImage, listFaceProducts, listProducts, matchScore } from "@/lib/catalog";
import { FOR_YOU_LIMIT, forYouProducts } from "@/lib/recommend";
import { sampleBaselineScan } from "@/lib/youcam/mock";
import { suitProduct } from "@/lib/suitability";

describe("product catalog", () => {
  it("loads the full export and keeps body, hair, and devices off the face shelf", () => {
    expect(listProducts()).toHaveLength(175);
    expect(JSON.stringify(rawCatalog).toLowerCase()).not.toMatch(/cosmedoc|tildacdn|tilda\.|https?:/);
    const face = listFaceProducts();
    expect(face.length).toBeGreaterThan(100);
    expect(face.length).toBeLessThan(listProducts().length);
    expect(face.every((product) => product.forFace && product.concerns.length > 0)).toBe(true);
    expect(face.some((product) => product.category === "Body" || product.category === "Hair" || product.category === "Devices")).toBe(false);
    expect(new Set(face.map((product) => product.brand))).toEqual(new Set(["Biologique Recherche", "ZO Skin Health", "Circadia"]));
  });

  it("maps raw 0–1 scores onto YouCam concerns and ranks by them", () => {
    const scores = concernScoresFromRaw(
      {
        oily: 0.1,
        dry: 0.2,
        combination: 0.2,
        balanced: 0.1,
        acne: 0.2,
        blackheads: 0.4,
        pores: 0.7,
        dark_circles: 0.1,
        puffiness: 0.1,
        lines: 0.94,
        eye_lines: 0.3,
        pigmentation: 0.8,
        role_cleanser: 0,
        role_cream: 0.8,
      },
      ["redness"],
    );
    expect(scores.wrinkle).toBe(0.94);
    expect(scores.firmness).toBe(0.94);
    expect(scores.pore).toBe(0.7);
    expect(scores.age_spot).toBe(0.8);
    expect(scores.radiance).toBe(0.8);
    expect(scores.redness).toBe(CONCERN_SCORE_MIN);

    const scan = sampleBaselineScan();
    const ranked = [...listFaceProducts()].sort((a, b) => matchScore(b, scan) - matchScore(a, scan));
    expect(matchScore(ranked[0], scan)).toBeGreaterThan(matchScore(ranked[ranked.length - 1], scan));
    expect(ranked[0].concernScores.wrinkle ?? 0).toBeGreaterThan(0.5);
  });

  it("prices in shekels and never sends oiliness to skin simulation", () => {
    expect(formatPrice(920)).toBe("₪920");
    expect(listProducts().every((product) => !/[\u0400-\u04FF]/.test(product.size))).toBe(true);
    expect(listProducts().find((product) => product.slug === "bodysmoothing")?.size).toBe("150 g");
    expect(listProducts().find((product) => product.slug === "oilcontrolpads")?.size).toBe("60 pieces");
    expect(listProducts().find((product) => product.slug === "caviarvert")?.size).toBe("1 piece");
    for (const product of listProducts()) {
      expect(product.tryOn.simulation).not.toHaveProperty("oiliness");
      expect(JSON.stringify(product).toLowerCase()).not.toMatch(/cosmedoc|tilda|tildacdn/);
      expect(product.name.length).toBeGreaterThan(0);
    }
  });

  it("does not skip a product from a keyword warning alone", () => {
    const scan = sampleBaselineScan();
    const match = listFaceProducts().find((product) => (product.concernScores.wrinkle ?? 0) >= 0.85)!;
    const warned = { ...match, warnings: ["pregnancy", "sun exposure caution"] };
    expect(suitProduct(warned, scan).verdict).toBe("suits");
    expect(suitProduct(warned, scan).warningNote).toMatch(/pregnancy/);
    expect(suitProduct(warned, scan).verdict).not.toBe("skip");

    const steady = { ...match, concerns: ["firmness" as const], concernScores: { firmness: 0.95 }, warnings: ["pregnancy"] };
    expect(suitProduct(steady, scan).verdict).toBe("skip");
    expect(suitProduct(steady, scan).warningNote).toMatch(/low-confidence/i);
  });

  it("builds a short For you list and only accepts brand-site photos", () => {
    const scan = sampleBaselineScan();
    const focus = new Set(scan.concerns.filter((item) => item.uiScore < 75).map((item) => item.id));
    const list = forYouProducts(scan);
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(FOR_YOU_LIMIT);
    expect(new Set(list.map((product) => product.slug)).size).toBe(list.length);
    const counts = new Map<string, number>();
    for (const product of list) {
      counts.set(product.routineRole, (counts.get(product.routineRole) ?? 0) + 1);
      expect(suitProduct(product, scan).verdict).not.toBe("skip");
      expect(product.concerns.some((id) => focus.has(id))).toBe(true);
      if (product.officialImageUrl) expect(isAllowedOfficialImage(product.officialImageUrl)).toBe(true);
    }
    const night = list.find((product) => product.slug === "nighttimerepair");
    expect(night?.officialImageUrl).toMatch(/^https:\/\/cdn\.shopify\.com\/s\/files\/1\/0820\/7771\/2682\//);
    const withPhoto = listProducts().filter((product) => product.officialImageUrl);
    expect(withPhoto).toHaveLength(165);
    expect(withPhoto.every((product) => isAllowedOfficialImage(product.officialImageUrl))).toBe(true);
    for (const id of ["BR_105", "BR_091", "BR_025", "BR_018", "ZO_058"]) {
      expect(listProducts().find((product) => product.id === id)?.officialImageUrl).toBeUndefined();
    }
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    expect(counts.size).toBeGreaterThan(1);
    const verdicts = list.map((product) => suitProduct(product, scan).verdict);
    const firstPatch = verdicts.indexOf("patch-test");
    const lastSuit = verdicts.lastIndexOf("suits");
    if (firstPatch !== -1 && lastSuit !== -1) expect(lastSuit).toBeLessThan(firstPatch);

    expect(isAllowedOfficialImage("https://www.zoskinhealth.com/cdn/shop/files/cream.jpg")).toBe(true);
    expect(isAllowedOfficialImage("https://www.biologique-recherche.com/media/cream.jpg")).toBe(true);
    expect(isAllowedOfficialImage("https://circadia.com/images/cream.jpg")).toBe(true);
    expect(isAllowedOfficialImage("https://cdn.shopify.com/s/files/1/0820/7771/2682/files/cream.png")).toBe(true);
    expect(isAllowedOfficialImage("https://cdn.shopify.com/s/files/1/0973/8466/1323/files/cream.webp")).toBe(true);
    expect(isAllowedOfficialImage("https://evil.shopify.com/cream.jpg")).toBe(false);
    expect(isAllowedOfficialImage("https://cdn.example.com/cream.jpg")).toBe(false);
    expect(isAllowedOfficialImage("http://www.zoskinhealth.com/cream.jpg")).toBe(false);
    expect(isAllowedOfficialImage("https://static.tildacdn.one/cream.png")).toBe(false);
    expect(isAllowedOfficialImage("https://cosmedoc.net/assets/products/catalog/cream.webp")).toBe(false);
  });
});
