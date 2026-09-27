"use client";

import { logActivity } from "./actions";

/** Fire-and-forget usage event that never throws (works offline too). */
export function track(type: string, payload?: Record<string, string | number | boolean | null>) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  logActivity(type, payload).catch(() => undefined);
}
