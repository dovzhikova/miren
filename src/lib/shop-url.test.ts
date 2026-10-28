import { describe, expect, it } from "vitest";
import { listFaceProducts, listMakeupProducts, listProducts, shopUrlFor } from "@/lib/catalog";
import { merchantCartDecision } from "@/lib/merchant";

describe("brand shop URLs", () => {
  it("uses verified search pages and does not invent product handles", () => {
    const face = listFaceProducts();
    const circadia = face.find((product) => product.brand === "Circadia");
    const recherche = face.find((product) => product.brand === "Biologique Recherche");
    const zo = face.find((product) => product.brand === "ZO Skin Health");
    expect(circadia && recherche && zo).toBeTruthy();
    expect(shopUrlFor(circadia!)).toBe(`https://circadia.com/search?q=${encodeURIComponent(circadia!.name)}`);
    expect(recherche!.shopUrl).toBe(`https://www.biologique-recherche.com/en-us/search?q=${encodeURIComponent(recherche!.name)}`);
    expect(zo!.shopUrl).toBe(`https://zoskinhealth.com/us/search?q=${encodeURIComponent(zo!.name)}`);
    expect(circadia!.shopUrl).toBe(shopUrlFor(circadia!));
    expect(shopUrlFor({ brand: "Rare Beauty", name: "Kind Words" })).toBeUndefined();
    expect(shopUrlFor({ brand: "Circadia", name: "   " })).toBeUndefined();
    for (const product of listMakeupProducts()) expect(product.shopUrl).toBeUndefined();
    for (const product of listProducts()) {
      if (!product.shopUrl) continue;
      expect(product.shopUrl.startsWith("https://")).toBe(true);
      expect(product.shopUrl).toContain("/search?q=");
      expect(product.shopUrl).not.toMatch(/\/products\//);
    }
  });
});

describe("merchant cart gate", () => {
  it("lets a skip add to the cart and keeps the warning", () => {
    const skip = merchantCartDecision("skip");
    expect(skip.allowAdd).toBe(true);
    expect(skip.warning).toMatch(/skip/i);
    expect(skip.warning).toMatch(/still add/i);
    const suits = merchantCartDecision("suits");
    expect(suits.allowAdd).toBe(true);
    expect(suits.warning).toBeNull();
    const patch = merchantCartDecision("patch-test");
    expect(patch.allowAdd).toBe(true);
    expect(patch.warning).toMatch(/patch-test/i);
  });
});
