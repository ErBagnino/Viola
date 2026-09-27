"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { cn } from "@/utils/cn";
import type { GroundingExercise } from "./types";

/**
 * Step-by-step grounding. Steps with a `count` show that many small inputs
 * (the 5-4-3-2-1 experience). Nothing typed here is saved anywhere.
 */
export function GroundingFlow({ exercise, onDone, doneHref = "/viola/calma" }: { exercise: GroundingExercise; onDone?: () => void; doneHref?: string }) {
  const steps = exercise.steps;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [finished, setFinished] = useState(false);
  const step = steps[i];

  const go = (delta: number) => {
    setDir(delta);
    if (i + delta >= steps.length) {
      setFinished(true);
      track("grounding_completed", { exercise: exercise.slug });
      return;
    }
    setI((v) => Math.max(0, Math.min(steps.length - 1, v + delta)));
  };

  if (finished) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <HeartBurst show />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl">
          ♡
        </motion.div>
        <p className="mt-4 max-w-xs font-display text-3xl font-semibold text-wine-900">{exercise.endText}</p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          {onDone ? (
            <Button size="lg" onClick={onDone}>
              Fatto ♡
            </Button>
          ) : (
            <Link href={doneHref} className="press btn-3d rounded-[1.25rem] bg-gradient-to-b from-wine-500 to-wine-700 px-6 py-4 text-center font-bold text-white">
              Fatto ♡
            </Link>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setFinished(false);
              setI(0);
              setAnswers({});
            }}
          >
            Rifacciamolo
          </Button>
        </div>
      </div>
    );
  }

  if (!step) return null;
  const values = answers[i] ?? [];
  const count = step.count ?? 0;

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <div className="mb-6 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-label="Avanzamento">
        {steps.map((_, k) => (
          <span key={k} className={cn("h-2 flex-1 rounded-full transition-colors", k <= i ? "bg-wine-500" : "bg-wine-100")} />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={i}
          custom={dir}
          initial={{ x: dir * 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: dir * -40, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 260 }}
          className="flex-1"
        >
          {step.emoji && (
            <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="mb-3 text-6xl" aria-hidden>
              {step.emoji}
            </motion.div>
          )}
          <h2 className="font-display text-3xl leading-tight font-semibold text-wine-900 text-balance">{step.title}</h2>
          {step.text && <p className="mt-2 text-lg text-ink-soft">{step.text}</p>}

          {count > 0 && (
            <div className="mt-6 space-y-2.5">
              {Array.from({ length: count }, (_, k) => (
                <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.06 }} className="flex items-center gap-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold", values[k]?.trim() ? "bg-wine-600 text-white" : "bg-white text-wine-500")}>
                    {values[k]?.trim() ? "♥" : k + 1}
                  </span>
                  <input
                    className="h-12 flex-1 rounded-2xl border border-blush-200 bg-white/80 px-4 focus:border-wine-300 focus:ring-4 focus:ring-blush-200/70 focus:outline-none"
                    placeholder="Scrivila, se vuoi…"
                    aria-label={`${step.title}: ${k + 1}`}
                    value={values[k] ?? ""}
                    onChange={(e) => {
                      const next = [...values];
                      next[k] = e.target.value;
                      setAnswers((a) => ({ ...a, [i]: next }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const el = e.currentTarget.parentElement?.nextElementSibling?.querySelector("input");
                        if (el) (el as HTMLInputElement).focus();
                        else go(1);
                      }
                    }}
                  />
                </motion.div>
              ))}
              <p className="pt-1 text-sm text-ink-muted">Non devi scriverle per forza: puoi anche solo trovarle con gli occhi.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-24 mt-8 flex items-center gap-2 lg:bottom-6">
        <Button variant="soft" size="icon" onClick={() => go(-1)} disabled={i === 0} aria-label="Indietro">
          <ChevronLeft className="size-6" />
        </Button>
        <Button size="lg" className="flex-1" onClick={() => go(1)}>
          {i === steps.length - 1 ? "Ho finito" : "Avanti"} <ChevronRight className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => go(1)} aria-label="Salta">
          <SkipForward className="size-5" />
        </Button>
      </div>
    </div>
  );
}
