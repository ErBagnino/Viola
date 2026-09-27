import "server-only";
import sharp from "sharp";

/**
 * Re-encodes an uploaded photo: fixes orientation, strips ALL metadata
 * (EXIF / GPS), resizes and converts to WebP + a small thumbnail.
 */
export async function processImage(input: Buffer) {
  const base = sharp(input, { failOn: "error", limitInputPixels: 80_000_000 }).rotate();
  const full = await base.clone().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  return { full: full.data, width: full.info.width, height: full.info.height, thumb };
}
