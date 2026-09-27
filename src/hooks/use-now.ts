"use client";

import { useSyncExternalStore } from "react";

/** Current time, refreshed every `intervalMs` (null during SSR). */
export function useNow(intervalMs = 1000): Date | null {
  const bucket = useSyncExternalStore(
    (cb) => {
      const t = setInterval(cb, intervalMs);
      return () => clearInterval(t);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );
  return bucket === null ? null : new Date(bucket);
}
