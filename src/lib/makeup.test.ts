import { describe, expect, it } from "vitest";
import { isAllowedOfficialImage, listFaceProducts, listMakeupProducts } from "@/lib/catalog";
import { forYouProducts, makeupForYou } from "@/lib/recommend";
import { suitProduct } from "@/lib/suitability";
import { sampleBaselineScan } from "@/lib/youcam/mock";

describe("makeup shelf", () => {
  it("keeps colour off the skincare shortlist and on its own for-you list", () => {
    const scan = sampleBaselineScan();
    const skincare = forYouProducts(scan);
    expect(skincare.every((product) => product.routineRole !== "makeup")).toBe(true);
    expect(listFaceProducts().every((product) => product.routineRole !== "makeup")).toBe(true);

    const makeup = makeupForYou(scan);
    expect(makeup.length).toBeGreaterThanOrEqual(3);
    expect(makeup.length).toBeLessThanOrEqual(4);
    expect(new Set(makeup.map((product) => product.category)).size).toBe(makeup.length);
    expect(makeup.map((product) => product.slug)).toContain("color-block-cinnabar");
    expect(makeup.map((product) => product.slug)).not.toContain("kind-words-talented");
    const verdicts = makeup.map((product) => suitProduct(product, scan).verdict);
    expect(verdicts.every((verdict) => verdict === "suits")).toBe(true);
    expect(suitProduct(listMakeupProducts().find((product) => product.slug === "kind-words-talented")!, scan).verdict).toBe("patch-test");
  });

  it("sends a real makeup payload and only official photos", () => {
    expect(listMakeupProducts()).toHaveLength(6);
    for (const product of listMakeupProducts()) {
      expect(product.tryOn.kind).toBe("makeup");
      expect(product.tryOn.effects?.length).toBeGreaterThan(0);
      const color = product.tryOn.effects?.find((effect) => effect.category !== "skin_smooth");
      expect(color?.category).toMatch(/lip_color|blush|foundation|concealer/);
      expect(JSON.stringify(product).toLowerCase()).not.toMatch(/cosmedoc|tilda|tildacdn/);
      expect(isAllowedOfficialImage(product.officialImageUrl)).toBe(true);
      expect(product.officialImageUrl).toContain("cdn.shopify.com");
      expect(product.officialImageUrl).toContain("width=1600");
    }
    const lip = listMakeupProducts().find((product) => product.slug === "color-block-cinnabar");
    const effect = lip?.tryOn.effects?.find((item) => item.category === "lip_color") as { shape?: { name?: string }; style?: { type?: string } };
    expect(effect.shape?.name).toBe("original");
    expect(effect.style?.type).toBe("full");
  });
});
