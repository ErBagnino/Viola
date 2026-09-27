// Tiny tactile feedback where the platform supports it (Android). iPhone
// Safari has no vibration API: it simply does nothing there.
const PATTERNS: Record<"tap" | "success" | "heart" | "urgent", number | number[]> = {
  tap: 12,
  success: [18, 60, 24],
  heart: [30, 80, 30],
  urgent: 40,
};

export function haptic(kind: keyof typeof PATTERNS = "tap") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* unsupported: silent */
  }
}
