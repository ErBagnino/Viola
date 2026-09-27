"use client";

import { createContext, useContext } from "react";

/** Set by Viola's shell: pages inside it always offer a one-tap way to reach Adam. */
export const NeedAdamShortcut = createContext<string | null>(null);

export function useNeedAdamShortcut() {
  return useContext(NeedAdamShortcut);
}
