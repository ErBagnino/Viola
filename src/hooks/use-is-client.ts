"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false during SSR and hydration, true afterwards (no mismatch). */
export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}
