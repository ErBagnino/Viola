"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";
import { saveMood } from "./actions";
import { MOODS } from "@/features/content/constants";
import { callAction } from "@/utils/call-action";
import { haptic } from "@/utils/haptics";


type Suggestion = { text: string; links: { href: string; label: string }[] };

// Gentle, non-diagnostic follow-ups.
function suggestionFor(mood: number | null): Suggestion {
  if (mood === null)
    return {
      text: "Va bene non saperlo. Possiamo scoprirlo piano piano.",
      links: [
        { href: "/viola/calma/54321", label: "5-4-3-2-1" },
        { href: "/viola/diario", label: "Scrivi nel diario" },
      ],
    };
  if (mood <= 2)
    return {
      text: "Grazie di avermelo detto. Facciamo una cosa piccola insieme?",
      links: [
        { href: "/viola/calma/respira", label: "Respira con me" },
        { href: "/viola/adam", label: "Ho bisogno di Adam" },
        { href: "/viola/noi/dediche?caso=1", label: "Una dedica" },
      ],
    };
  if (mood === 3)
    return {
      text: "Ok, giornata così così. Ti va una piccola distrazione?",
      links: [
        { href: "/viola/sorpresa", label: "Sorprendimi" },
        { href: "/viola/giochi", label: "Un gioco" },
      ],
    };
  return {
    text: "Che bello ♡ Ti va di dirlo ad Adam?",
    links: [
      { href: "/viola/scrivi", label: "Scrivi ad Adam" },
      { href: "/viola/oggi", label: "Una cosa per te" },
    ],
  };
}

export function MoodPicker({ title, compact }: { title: string; compact?: boolean }) {
  const [saved, setSaved] = useState<number | null | undefined>(undefined);
  const [sharedRaw, setSharedRaw] = useLocalStorage("vio:mood-shared", "1");
  const shared = sharedRaw === "1";
  const [pending, start] = useTransition();
  const toast = useToast();


  const pick = (mood: number | null) =>
    start(async () => {
      haptic("tap");
      const res = await callAction(() => saveMood({ mood, shared }));
      if (res.ok) setSaved(mood);
      else toast.show(res.error, "error");
    });

  const toggleShared = () => setSharedRaw(shared ? "0" : "1");

  const sug = saved !== undefined ? suggestionFor(saved) : null;

  return (
    <section className={cn("paper rounded-4xl p-5", compact && "p-4")} aria-labelledby="mood-title">
      <h2 id="mood-title" className="text-xl font-semibold text-vio-900">
        {title}
      </h2>
      <AnimatePresence mode="wait">
        {sug ? (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
            <p className="text-[15px] text-ink-soft">{sug.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sug.links.map((l) => (
                <Link key={l.href} href={l.href} className="press rounded-full bg-wine-700 px-4 py-2 text-sm font-bold text-white">
                  {l.label}
                </Link>
              ))}
              <button type="button" onClick={() => setSaved(undefined)} className="press rounded-full px-3 py-2 text-sm font-bold text-vio-600">
                Cambia
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mt-3 grid grid-cols-5 gap-2" role="group" aria-label="Scegli come ti senti">
              {MOODS.map((m) => (
                <motion.button
                  key={m.value}
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ y: -3 }}
                  disabled={pending}
                  onClick={() => pick(m.value)}
                  className="grid aspect-square max-h-20 w-full place-items-center rounded-2xl bg-surface/80 text-[1.9rem] shadow-soft disabled:opacity-50 sm:aspect-auto sm:h-20"
                  aria-label={m.label}
                  title={m.label}
                >
                  {m.emoji}
                </motion.button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" disabled={pending} onClick={() => pick(null)} className="press min-h-11 rounded-full bg-lilac-100 px-4 text-sm font-bold text-lilac-600">
                Non lo so
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={shared}
                aria-label="Adam può vedere come mi sento"
                onClick={toggleShared}
                className="press inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-ink-soft hover:bg-surface/70"
              >
                {shared ? "♡ Adam può vederlo" : "🔒 Solo per me"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
