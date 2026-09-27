"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { HeartFlower, Sparkle } from "@/components/decor/stars";
import { completeOnboarding } from "./actions";

export function Onboarding({ slides, cta }: { slides: { title: string; text: string }[]; cta: string }) {
  const [open, setOpen] = useState(true);
  const [i, setI] = useState(0);
  const [pending, start] = useTransition();
  const last = i === slides.length - 1;

  const finish = () =>
    start(async () => {
      await completeOnboarding().catch(() => undefined);
      setOpen(false);
    });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-black px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)] text-center text-white"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          role="dialog"
          aria-modal="true"
          aria-label="Benvenuta"
        >
          <div />
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="relative mb-10"
            >
              <HeartFlower className="size-36" color="#da0e14" />
              <Sparkle className="absolute -top-2 -right-4 size-7 animate-twinkle text-white" />
              <Sparkle className="absolute -bottom-3 -left-5 size-5 animate-twinkle text-white [animation-delay:800ms]" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ y: 16, opacity: 0, filter: "blur(6px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -12, opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.6 }}
                className="max-w-sm"
              >
                <h2 className="font-display text-[2rem] leading-tight font-semibold text-balance">{slides[i]?.title}</h2>
                {slides[i]?.text && <p className="mt-3 text-white/70">{slides[i].text}</p>}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex w-full max-w-sm flex-col items-center gap-5">
            <div className="flex gap-2" aria-hidden>
              {slides.map((_, k) => (
                <span key={k} className={`h-2 rounded-full transition-all ${k === i ? "w-7 bg-rouge-500" : "w-2 bg-white/30"}`} />
              ))}
            </div>
            {last ? (
              <Button variant="love" size="xl" className="w-full" onClick={finish} loading={pending}>
                {cta}
              </Button>
            ) : (
              <Button variant="white" size="xl" className="w-full" onClick={() => setI((v) => v + 1)}>
                Avanti
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
