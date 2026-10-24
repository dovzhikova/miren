import sharp from "sharp";
import { GlowError } from "@/lib/errors";

export type PreparedImage = {
  bytes: Buffer;
  contentType: "image/jpeg";
  width: number;
  height: number;
  filename: string;
};

export function analysisProfile(width: number, height: number): "hd" | "sd" {
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  if (shortSide >= 1080 && longSide <= 2560) return "hd";
  return "sd";
}

export async function prepareUpload(input: Buffer): Promise<PreparedImage> {
  const pipeline = sharp(input, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata().catch(() => null);
  if (!meta?.width || !meta?.height) {
    throw new GlowError("That file is not a photo we can read. Use a JPEG or PNG.", 400);
  }

  // Fit after EXIF rotation, so portrait dimensions are never calculated from an unrotated header.
  const { data, info } = await pipeline
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer({ resolveWithObject: true });
  const shortSide = Math.min(info.width, info.height);
  if (shortSide < 480) {
    throw new GlowError(
      "Move closer. YouCam needs the short side of the photo to be at least 480 pixels.",
      400,
      "error_below_min_image_size",
    );
  }
  if (data.length > 9_000_000) {
    throw new GlowError("That photo is still too large after resizing. Try another one.", 400, "exceed_max_filesize");
  }

  return {
    bytes: data,
    contentType: "image/jpeg",
    width: info.width,
    height: info.height,
    filename: "glowcheck-selfie.jpg",
  };
}
