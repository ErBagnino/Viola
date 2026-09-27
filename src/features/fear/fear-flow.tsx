"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { BreathingVisual } from "@/features/breathing/breathing-visual";
import { stateAt, PHASE_LABEL } from "@/features/breathing/cycle";
import { track } from "@/features/activity/track";
import { cn } from "@/utils/cn";

type Step = { title: string; text: string };

export type FearChoice = { label: string; href: string | null; icon: string; primary?: boolean };

/** Three calm breaths embedded in the flow (4 in / 2 hold / 6 out). */
function MiniBreath() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const s = stateAt({ inhale: 4, hold: 2, exhale: 6, holdAfter: 0, rounds: 3 }, t);
  return (
    <div className="mt-6 flex flex-col items-center">
      <div className="size-48">
        <BreathingVisual visual="sphere" expansion={s.done ? 0.4 : s.expansion} />
      </div>
      <p className="mt-2 font-display text-2xl font-semibold uppercase" aria-live="polite">
        {s.done ? "Bene così ♡" : `${PHASE_LABEL[s.phase]} · ${s.secondsLeft}`}
      </p>
    </div>
  );
}

export function FearFlow({
  intro1,
  intro2,
  steps,
  feelings,
  choices,
  safetyNote,
  emergencyNumber,
}: {
  intro1: string;
  intro2: string;
  steps: Step[];
  feelings: string[];
  choices: FearChoice[];
  safetyNote: string;
  emergencyNumber: string;
}) {
  // screens: intro1, intro2, ...steps
  const screens = 2 + steps.length;
  const [i, setI] = useState(0);
  const [feeling, setFeeling] = useState<string | null>(null);

  useEffect(() => {
    if (i === screens - 1) track("fear_flow_completed");
  }, [i, screens]);

  const isIntro = i < 2;
  const stepIndex = i - 2;
  const step = steps[stepIndex];
  const isBreathStep = !isIntro && /respir/i.test(step?.title ?? "");
  const isFeelStep = !isIntro && stepIndex === steps.length - 2;
  const isChoiceStep = !isIntro && stepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-wine-800 via-wine-700 to-lilac-600 px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)] text-white">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link href="/viola" className="press grid size-11 place-items-center rounded-2xl bg-white/10" aria-label="Esci">
          <X className="size-5" />
        </Link>
        {!isIntro && (
          <div className="flex gap-1.5" aria-label={`Passo ${stepIndex + 1} di ${steps.length}`}>
            {steps.map((_, k) => (
              <span key={k} className={cn("h-1.5 w-6 rounded-full", k <= stepIndex ? "bg-white" : "bg-white/25")} />
            ))}
          </div>
        )}
        <span className="size-11" />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center overflow-y-auto py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5 }}
          >
            {isIntro ? (
              <h1 className="font-display text-[2.1rem] leading-tight font-semibold text-balance">{i === 0 ? intro1 : intro2}</h1>
            ) : (
              <>
                <p className="text-sm font-extrabold tracking-widest text-white/60 uppercase">
                  {stepIndex + 1}. {step.title}
                </p>
                <h1 className="mt-2 font-display text-[1.9rem] leading-tight font-semibold text-balance">{step.text || step.title}</h1>
                {isBreathStep && <MiniBreath />}
                {isFeelStep && (
                  <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Cosa senti">
                    {feelings.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFeeling(f === feeling ? null : f)}
                        aria-pressed={feeling === f}
                        className={cn("press rounded-full px-4 py-2.5 font-bold", feeling === f ? "bg-white text-wine-800" : "bg-white/15 text-white")}
                      >
                        {f}
                      </button>
                    ))}
                    {feeling && <p className="w-full pt-3 text-white/80">Ok. È {feeling.toLowerCase()}. Ha un nome, e passerà.</p>}
                  </div>
                )}
                {isChoiceStep && (
                  <div className="mt-6 grid grid-cols-2 gap-2.5">
                    {choices
                      .filter((c) => c.href)
                      .map((c) => (
                        <Link
                          key={c.label}
                          href={c.href!}
                          className={cn(
                            "press flex items-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold",
                            c.primary ? "col-span-2 justify-center bg-white text-wine-800" : "bg-white/15 text-white",
                          )}
                        >
                          <Icon name={c.icon} className="size-5 text-lg" /> {c.label}
                        </Link>
                      ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto w-full max-w-md">
        {!isChoiceStep && (
          <div className="flex gap-2">
            {i > 0 && (
              <Button variant="night" size="icon" onClick={() => setI((v) => v - 1)} aria-label="Indietro">
                <ChevronLeft className="size-6" />
              </Button>
            )}
            <Button variant="white" size="lg" className="flex-1" onClick={() => setI((v) => Math.min(screens - 1, v + 1))}>
              {isIntro ? "Ok" : "Fatto"} <ChevronRight className="size-5" />
            </Button>
          </div>
        )}
        <p className="mt-4 text-center text-xs leading-relaxed text-white/60">
          {safetyNote}{" "}
          <a href={`tel:${emergencyNumber}`} className="font-bold text-white underline">
            Chiama {emergencyNumber}
          </a>
        </p>
      </div>
    </div>
  );
}
