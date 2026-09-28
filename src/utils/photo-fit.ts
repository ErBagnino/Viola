// Pure rules of the smart photo display (see components/ui/photo.tsx).
// A photo is never stretched: it is shown whole, or cropped a little around
// the subject, or shown whole on a soft blurred copy of itself.

export type PhotoFocus = "center" | "top" | "bottom" | "left" | "right";
export type AspectKind = "extreme-portrait" | "portrait" | "square" | "landscape" | "extreme-landscape";

/** What every view needs to show a photo well. */
export type PhotoSrc = {
  url: string;
  /** small version, used for the blurred fill (cheap to download) */
  thumbUrl?: string | null;
  width?: number | null;
  height?: number | null;
  focus?: string | null;
};

/** object-position for each subject position (a little margin from the edge). */
export const FOCUS_POSITION: Record<PhotoFocus, string> = {
  center: "50% 50%",
  top: "50% 15%",
  bottom: "50% 85%",
  left: "15% 50%",
  right: "85% 50%",
};

export function focusPosition(focus?: string | null) {
  return FOCUS_POSITION[(focus as PhotoFocus) in FOCUS_POSITION ? (focus as PhotoFocus) : "center"];
}

/** width / height, or null when unknown. */
export function aspectRatioOf(width?: number | null, height?: number | null) {
  return width && height && width > 0 && height > 0 ? width / height : null;
}

/** 9:16 phone portraits are "extreme"; 3:4 is "portrait"; 16:9 is still "landscape"; panoramas are "extreme". */
export function aspectKind(ratio: number | null): AspectKind | null {
  if (ratio === null) return null;
  if (ratio < 0.62) return "extreme-portrait";
  if (ratio < 0.9) return "portrait";
  if (ratio <= 1.1) return "square";
  if (ratio <= 1.9) return "landscape";
  return "extreme-landscape";
}

/** Up to this much difference between photo and frame, a light crop looks better than bands. */
export const CROP_TOLERANCE = 1.34;

export type Fit = "cover" | "contain" | "ambient";

/**
 * How to place a photo in a frame:
 * - "cover": fills the frame, light crop (subject kept by `focus`)
 * - "contain": whole photo, nothing around (lightbox)
 * - "ambient": whole photo on a soft blurred copy of itself (no white bands)
 */
export function fitFor(ratio: number | null, frame: number, mode: "cover" | "contain" | "smart"): Fit {
  if (mode === "cover") return "cover";
  if (mode === "contain") return "contain";
  if (ratio === null) return "cover";
  const mismatch = Math.max(ratio / frame, frame / ratio);
  return mismatch <= CROP_TOLERANCE ? "cover" : "ambient";
}

/** "Natural" frames follow the photo, within limits: very tall/wide photos get a calmer frame. */
export function naturalFrame(ratio: number | null, min = 4 / 5, max = 16 / 9) {
  if (ratio === null) return 4 / 3;
  return Math.min(max, Math.max(min, ratio));
}
