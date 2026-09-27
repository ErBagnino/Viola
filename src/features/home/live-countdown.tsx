"use client";

import { useNow } from "@/hooks/use-now";
import { countdownParts, nextOccurrence } from "@/utils/dates";

export function LiveCountdown({ target, recurring, compact, tone = "light" }: { target: string; recurring?: boolean; compact?: boolean; tone?: "light" | "dark" }) {
  const now = useNow(1000);
  if (!now) return <div className="h-14" aria-hidden />;
  const t = nextOccurrence(target, Boolean(recurring), now);
  const c = countdownParts(t, now);
  if (c.done) return <p className="font-hand text-3xl">È oggi! ♡</p>;
  const units = compact
    ? [
        { v: c.days, l: c.days === 1 ? "giorno" : "giorni" },
        { v: c.hours, l: "ore" },
      ]
    : [
        { v: c.days, l: c.days === 1 ? "giorno" : "giorni" },
        { v: c.hours, l: "ore" },
        { v: c.minutes, l: "min" },
        { v: c.seconds, l: "sec" },
      ];
  return (
    <div className="flex gap-2" role="timer" aria-label={`Mancano ${c.days} giorni e ${c.hours} ore`}>
      {units.map((u) => (
        <div key={u.l} className={`min-w-14 rounded-2xl px-2.5 py-2 text-center ${tone === "dark" ? "bg-white/15" : "bg-white/75"}`}>
          <div className="font-display text-2xl leading-none font-semibold tabular-nums">{String(u.v).padStart(2, "0")}</div>
          <div className="mt-1 text-[11px] font-bold uppercase opacity-70">{u.l}</div>
        </div>
      ))}
    </div>
  );
}
