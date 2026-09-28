import { describe, expect, it } from "vitest";
import { aspectKind, aspectRatioOf, CROP_TOLERANCE, fitFor, focusPosition, naturalFrame } from "@/utils/photo-fit";

// Typical photos: phone portrait 3:4, story 9:16, square, 4:3, 16:9, panorama 3:1.
const PORTRAIT = aspectRatioOf(3000, 4000)!;
const EXTREME_PORTRAIT = aspectRatioOf(1080, 1920)!;
const SQUARE = aspectRatioOf(2000, 2000)!;
const LANDSCAPE = aspectRatioOf(4000, 3000)!;
const WIDE = aspectRatioOf(1920, 1080)!;
const PANORAMA = aspectRatioOf(6000, 2000)!;

describe("smart photo display", () => {
  it("classifies the shape of every photo", () => {
    expect(aspectKind(PORTRAIT)).toBe("portrait");
    expect(aspectKind(EXTREME_PORTRAIT)).toBe("extreme-portrait");
    expect(aspectKind(SQUARE)).toBe("square");
    expect(aspectKind(LANDSCAPE)).toBe("landscape");
    expect(aspectKind(WIDE)).toBe("landscape");
    expect(aspectKind(PANORAMA)).toBe("extreme-landscape");
    expect(aspectKind(aspectRatioOf(null, 100))).toBeNull();
    expect(aspectRatioOf(0, 100)).toBeNull();
  });

  it("gallery squares: a light crop for normal photos, the whole photo on a soft fill for extreme ones", () => {
    expect(fitFor(SQUARE, 1, "smart")).toBe("cover");
    expect(fitFor(PORTRAIT, 1, "smart")).toBe("cover"); // 3:4 in a square: ~25% crop, keeps the subject
    expect(fitFor(LANDSCAPE, 1, "smart")).toBe("cover");
    expect(fitFor(EXTREME_PORTRAIT, 1, "smart")).toBe("ambient"); // no huge crop, no white bands
    expect(fitFor(PANORAMA, 1, "smart")).toBe("ambient");
  });

  it("memory cards (16:9): portraits are shown whole instead of cut in half", () => {
    expect(fitFor(WIDE, 16 / 9, "smart")).toBe("cover");
    expect(fitFor(PORTRAIT, 16 / 9, "smart")).toBe("ambient");
  });

  it("natural frames follow the photo, calmer for extreme shapes", () => {
    expect(naturalFrame(LANDSCAPE)).toBeCloseTo(4 / 3);
    expect(naturalFrame(PORTRAIT)).toBeCloseTo(4 / 5); // 3:4 → 4:5 frame, tiny crop
    expect(fitFor(PORTRAIT, naturalFrame(PORTRAIT), "smart")).toBe("cover");
    expect(naturalFrame(EXTREME_PORTRAIT)).toBeCloseTo(4 / 5);
    expect(fitFor(EXTREME_PORTRAIT, naturalFrame(EXTREME_PORTRAIT), "smart")).toBe("ambient");
    expect(naturalFrame(PANORAMA)).toBeCloseTo(16 / 9);
    expect(fitFor(PANORAMA, naturalFrame(PANORAMA), "smart")).toBe("ambient");
    expect(naturalFrame(null)).toBeCloseTo(4 / 3);
  });

  it("the lightbox always shows the whole photo; games always fill the card", () => {
    for (const r of [PORTRAIT, EXTREME_PORTRAIT, SQUARE, PANORAMA]) {
      expect(fitFor(r, 1, "contain")).toBe("contain");
      expect(fitFor(r, 1, "cover")).toBe("cover");
    }
  });

  it("never crops more than the tolerance allows in smart mode", () => {
    for (const r of [0.3, 0.5, 0.62, 0.75, 1, 1.33, 1.78, 2.5, 4]) {
      for (const frame of [4 / 5, 1, 4 / 3, 16 / 9]) {
        if (fitFor(r, frame, "smart") === "cover") expect(Math.max(r / frame, frame / r)).toBeLessThanOrEqual(CROP_TOLERANCE);
      }
    }
  });

  it("subject position keeps faces in view", () => {
    expect(focusPosition("top")).toBe("50% 15%");
    expect(focusPosition("left")).toBe("15% 50%");
    expect(focusPosition(null)).toBe("50% 50%");
    expect(focusPosition("diagonale")).toBe("50% 50%");
  });
});
