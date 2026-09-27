"use client";

import { useNow } from "@/hooks/use-now";
import { countdownParts, DEFAULT_TZ, occurrenceOf } from "@/utils/dates";

export function LiveCountdown({
  target,
  recurring,
  compact,
  tone = "light",
  tz = DEFAULT_TZ,
  lead,
  todayText = "È oggi. ♡",
}: {
  target: string;
  recurring?: boolean;
  compact?: boolean;
  tone?: "light" | "dark";
  tz?: string;
  /** end of "Mancano 12 giorni …", e.g. "per rivederti" */
  lead?: string | null;
  todayText?: string;
}) {
  const now = useNow(1000);
  if (!now) return <div className="h-14" aria-hidden />;
  const occ = occurrenceOf(target, Boolean(recurring), now, tz);
  const c = countdownParts(occ.at, now);
  if (occ.isToday || c.done) return <p className="font-hand text-3xl">{todayText}</p>;
  const dayWord = c.days === 1 ? "giorno" : "giorni";
  const sentence = c.days > 0 ? `${c.days === 1 ? "Manca" : "Mancano"} ${c.days} ${dayWord}${lead ? ` ${lead}` : ""}.` : `Mancano poche ore${lead ? ` ${lead}` : ""}.`;
  const units = compact
    ? [
        { v: c.days, l: dayWord },
        { v: c.hours, l: "ore" },
      ]
    : [
        { v: c.days, l: dayWord },
        { v: c.hours, l: "ore" },
        { v: c.minutes, l: "min" },
        { v: c.seconds, l: "sec" },
      ];
  return (
    <div>
      {lead && <p className="mb-2 text-[15px] font-bold opacity-85">{sentence}</p>}
      <div className="flex gap-2" role="timer" aria-label={sentence}>
        {units.map((u) => (
          <div key={u.l} className={`min-w-14 rounded-2xl px-2.5 py-2 text-center ${tone === "dark" ? "bg-white/15" : "bg-white/75"}`}>
            <div className="font-display text-2xl leading-none font-semibold tabular-nums">{String(u.v).padStart(2, "0")}</div>
            <div className="mt-1 text-[11px] font-bold uppercase opacity-70">{u.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
