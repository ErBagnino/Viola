"use client";

import { useNow } from "@/hooks/use-now";

/** Easter egg: at 11:11 and 23:11 (the couple's time zone) a wish appears. */
export function WishTime({ tz }: { tz: string }) {
  const now = useNow(15_000);
  if (!now) return null;
  const hm = new Intl.DateTimeFormat("it-IT", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  if (hm !== "11:11" && hm !== "23:11") return null;
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-night-900 px-4 py-2 text-sm font-bold text-moon" role="status">
      ✦ {hm} · esprimi un desiderio
    </p>
  );
}
