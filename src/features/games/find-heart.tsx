"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { seededRandom } from "@/utils/random";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { cn } from "@/utils/cn";

const DECOYS = ["🌸", "⭐", "🌙", "🍓", "🦋", "🍭", "🌷", "🐚"];

export function FindHeart({ seed }: { seed: string }) {
  const [level, setLevel] = useState(1);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const size = Math.min(3 + Math.floor((level - 1) / 2), 6);
  const total = size * size;

  // Deterministic per level: same on server render and hydration.
  const target = Math.floor(seededRandom(`${seed}:${level}`)() * total);
  const nextLevel = () => {
    setLevel((l) => l + 1);
    setRevealed([]);
    setFound(false);
  };

  const pick = (i: number) => {
    if (found || revealed.includes(i)) return;
    setRevealed((r) => [...r, i]);
    if (i === target) {
      setFound(true);
      if ("vibrate" in navigator) navigator.vibrate?.([30, 40, 30]);
      track("game_played", { game: "find_heart", level });
    }
  };

  return (
    <div>
      <HeartBurst show={found} />
      <div className="mb-3 flex items-center justify-between text-sm font-bold text-vio-700">
        <span>Livello {level}</span>
        <span>Tentativi: {revealed.length}</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, i) => {
          const open = revealed.includes(i);
          return (
            <motion.button
              key={`${level}-${i}`}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => pick(i)}
              className={cn("grid aspect-square place-items-center rounded-2xl text-2xl shadow-soft", open ? "bg-surface" : "bg-gradient-to-br from-lilac-200 to-blush-200")}
              aria-label={open ? (i === target ? "Cuore trovato" : "Vuoto") : `Casella ${i + 1}`}
            >
              {open ? (i === target ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1.3 }}>💗</motion.span> : DECOYS[i % DECOYS.length]) : "?"}
            </motion.button>
          );
        })}
      </div>
      {found && (
        <div className="mt-5 text-center">
          <p className="font-display text-2xl font-semibold text-vio-900">L&apos;hai trovato! Come hai trovato me ♡</p>
          <Button className="mt-4 w-full" size="lg" onClick={nextLevel}>
            Livello {level + 1}
          </Button>
        </div>
      )}
    </div>
  );
}
