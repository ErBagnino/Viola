"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";

const LEVELS = [
  { max: 20, text: "Un pochino 🤏", emoji: "🙂" },
  { max: 40, text: "Abbastanza", emoji: "😊" },
  { max: 60, text: "Tanto", emoji: "🥰" },
  { max: 80, text: "Tantissimo", emoji: "😍" },
  { max: 99, text: "Fino alla luna", emoji: "🌙" },
  { max: 100, text: "Più di tutto", emoji: "💘" },
];

export function LoveSlider({ adamName }: { adamName: string }) {
  const [v, setV] = useState(50);
  const [sent, setSent] = useState(false);
  const level = LEVELS.find((l) => v <= l.max) ?? LEVELS[LEVELS.length - 1];
  return (
    <div className="text-center">
      <HeartBurst show={sent} />
      <h2 className="font-display text-2xl font-semibold text-vio-900">Quanto mi vuoi bene?</h2>
      <motion.p key={level.emoji} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="mt-6 text-7xl">
        {level.emoji}
      </motion.p>
      <p className="mt-3 font-display text-xl text-vio-800">{level.text}</p>
      <input
        type="range"
        min={0}
        max={100}
        value={v}
        onChange={(e) => {
          setV(Number(e.target.value));
          setSent(false);
        }}
        className="mt-6 h-11 w-full cursor-pointer accent-rouge-500"
        aria-label="Quanto mi vuoi bene"
      />
      <Button size="lg" className="mt-6 w-full" onClick={() => setSent(true)}>
        Conferma
      </Button>
      <AnimatePresence>
        {sent && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="paper mt-5 rounded-3xl p-5">
            <p className="font-hand text-3xl text-vio-600">Risultato ufficiale:</p>
            <p className="mt-1 font-display text-2xl font-semibold text-vio-900">{adamName} ti vuole bene ancora di più. Sempre. ♡</p>
            <p className="mt-1 text-sm text-ink-muted">(Il termometro è truccato. Lo ammetto.)</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
