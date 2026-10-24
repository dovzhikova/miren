import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { analysisProfile, prepareUpload } from "@/lib/youcam/image";

describe("source image preparation", () => {
  it("preserves a portrait at analysis quality instead of reusing its thumbnail", async () => {
    const source = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: "#bd9384" } }).jpeg().toBuffer();
    const prepared = await prepareUpload(source);
    expect(prepared.width).toBe(1200);
    expect(prepared.height).toBe(1600);
    expect(analysisProfile(prepared.width, prepared.height)).toBe("hd");
  });
  it.each([6, 8])("fits a phone photo after EXIF rotation %s", async (orientation) => {
    const source = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#bd9384" } }).jpeg().withMetadata({ orientation }).toBuffer();
    const prepared = await prepareUpload(source);
    expect(prepared.width).toBe(1440);
    expect(prepared.height).toBe(1920);
    expect((await sharp(prepared.bytes).metadata()).orientation).toBeUndefined();
  });
  it("rejects a portrait thumbnail with an undersized short edge", async () => {
    const thumbnail = await sharp({ create: { width: 360, height: 480, channels: 3, background: "#bd9384" } }).jpeg().toBuffer();
    await expect(prepareUpload(thumbnail)).rejects.toMatchObject({ status: 400, code: "error_below_min_image_size" });
  });
  it("rejects invalid image bytes with a recoverable input error", async () => {
    await expect(prepareUpload(Buffer.from("not an image"))).rejects.toMatchObject({ status: 400 });
  });
});
