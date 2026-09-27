import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processImage } from "@/server/media-upload";

describe("photo processing", () => {
  it("re-encodes to WebP, resizes and strips EXIF / GPS", async () => {
    const input = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#c86478" } })
      .jpeg()
      .withExif({ IFD0: { Make: "Phone" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "45/1 4/1 0/1" } })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeTruthy();
    const out = await processImage(input);
    const meta = await sharp(out.full).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2048);
    expect(meta.exif).toBeUndefined();
    const thumb = await sharp(out.thumb).metadata();
    expect(Math.max(thumb.width!, thumb.height!)).toBeLessThanOrEqual(480);
  });

  it("refuses non-images", async () => {
    await expect(processImage(Buffer.from("<svg onload=alert(1)>"))).rejects.toThrow();
  });
});
