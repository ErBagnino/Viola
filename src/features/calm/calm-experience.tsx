"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { useNow } from "@/hooks/use-now";
import { pickOne } from "@/utils/random";
import { cn } from "@/utils/cn";
import { CalmScene } from "./calm-scene";
import { CALM_MODES, type CalmMode } from "./modes";

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function CalmExperience({ timers, endText, initialMode }: { timers: number[]; endText: string; initialMode: CalmMode | null }) {
  const [mode, setMode] = useState<CalmMode | null>(initialMode);
  const [seconds, setSeconds] = useState<number>(timers[1] ?? 120);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const now = useNow(250);
  const logged = useRef(false);

  // The session clock starts on the first tick after a mode is chosen.
  const elapsed = startedAt && now ? Math.max(0, (now.getTime() - startedAt) / 1000) : 0;
  const done = Boolean(mode && startedAt && seconds > 0 && elapsed >= seconds);
  const left = seconds > 0 ? Math.max(0, seconds - elapsed) : elapsed;

  useEffect(() => {
    if (done && !logged.current) {
      logged.current = true;
      track("calm_completed", { mode: mode ?? "", seconds });
    }
  }, [done, mode, seconds]);

  const start = (m: CalmMode) => {
    logged.current = false;
    setMode(m);
    // `now` comes from the shared clock hook (keeps render pure)
    setStartedAt(now ? now.getTime() : null);
  };
  const close = () => {
    setMode(null);
    setStartedAt(null);
  };
  const info = CALM_MODES.find((m) => m.value === mode);

  return (
    <>
      <section aria-label="Durata" className="paper rounded-4xl p-4">
        <p className="mb-2 text-xs font-extrabold tracking-widest text-vio-500 uppercase">Quanto tempo?</p>
        <div className="flex flex-wrap gap-2">
          {timers.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSeconds(t)}
              aria-pressed={seconds === t}
              className={cn("press min-h-11 rounded-full px-4 py-2 text-sm font-bold", seconds === t ? "bg-wine-700 text-white" : "bg-surface text-vio-700")}
            >
              {t === 0 ? "Libero" : `${Math.round(t / 60)} min`}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {CALM_MODES.map((m) => (
          <motion.button key={m.value} type="button" whileTap={{ scale: 0.96 }} onClick={() => start(m.value)} className="paper rounded-[1.75rem] p-4 text-left">
            <span className="text-3xl" aria-hidden>
              {m.emoji}
            </span>
            <span className="mt-2 block font-extrabold text-vio-900">{m.label}</span>
            <span className="block text-xs text-ink-soft">{m.hint}</span>
          </motion.button>
        ))}
      </div>
      <Button variant="soft" size="lg" className="mt-4 w-full" onClick={() => start(pickOne(CALM_MODES)?.value ?? "heart")}>
        <Shuffle className="size-5" /> Scegli tu per me
      </Button>

      <AnimatePresence>
        {mode && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-gradient-to-b from-cream-50 via-blush-50 to-lilac-100 px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HeartBurst show={done} />
            <div className="flex w-full max-w-md items-center justify-between">
              <button type="button" onClick={close} className="press paper grid size-11 place-items-center rounded-2xl" aria-label="Chiudi">
                <X className="size-5" />
              </button>
              <p className="text-sm font-bold text-vio-700">{info?.label}</p>
              <p className="w-11 text-right text-sm font-extrabold text-vio-600 tabular-nums" aria-live="off">
                {startedAt ? fmt(left) : ""}
              </p>
            </div>
            <div className="grid flex-1 place-items-center">
              {done ? (
                <motion.p initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-xs text-center font-display text-3xl font-semibold text-vio-900">
                  {endText}
                </motion.p>
              ) : (
                <CalmScene mode={mode} />
              )}
            </div>
            <p className="mb-3 text-center text-sm text-ink-soft">{done ? "" : info?.hint}</p>
            <div className="flex w-full max-w-md gap-3">
              {done ? (
                <>
                  <Button variant="soft" size="lg" className="flex-1" onClick={() => start(mode)}>
                    Ancora
                  </Button>
                  <Button size="lg" className="flex-1" onClick={close}>
                    Fatto ♡
                  </Button>
                </>
              ) : !startedAt ? (
                <Button size="lg" className="flex-1" onClick={() => start(mode)}>
                  Inizia
                </Button>
              ) : (
                <Button variant="white" size="lg" className="flex-1" onClick={close}>
                  Basta così
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
