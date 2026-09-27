"use client";

import { useEffect } from "react";

/** Registers /sw.js (offline fallback, caching, Web Push). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const enabled = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "1";
    if (!enabled) return;
    const register = () => {
      // A new build id = a new script URL = the browser installs the new worker.
      const version = encodeURIComponent(process.env.NEXT_PUBLIC_BUILD_ID ?? "dev");
      navigator.serviceWorker.register(`/sw.js?v=${version}`, { scope: "/", updateViaCache: "none" }).catch(() => {
        /* the app works without it */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
