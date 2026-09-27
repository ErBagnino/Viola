"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pickAvoiding } from "@/utils/random";

export function SmileCard({ phrases, initialIndex = 0 }: { phrases: string[]; initialIndex?: number }) {
  const items = phrases.map((p, i) => ({ id: String(i), text: p }));
  const [recent, setRecent] = useState<string[]>([]);
  const [cur, setCur] = useState(() => items[initialIndex] ?? items[0] ?? null);
  if (!cur) return null;
  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={cur.id}
          initial={{ rotate: -3, scale: 0.9, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 3, scale: 0.9, opacity: 0 }}
          className="rounded-[2rem] bg-gradient-to-br from-peach-100 to-blush-100 p-6 shadow-soft"
        >
          <p className="text-4xl" aria-hidden>
            😄
          </p>
          <p className="mt-3 font-display text-2xl leading-snug text-vio-900">{cur.text}</p>
        </motion.div>
      </AnimatePresence>
      <Button
        variant="white"
        size="lg"
        className="mt-3 w-full"
        onClick={() => {
          const next = pickAvoiding(items, [...recent, cur.id]);
          if (next) {
            setRecent((r) => [...r, cur.id].slice(-4));
            setCur(next);
          }
        }}
        disabled={items.length < 2}
      >
        <Shuffle className="size-5" /> Un&apos;altra
      </Button>
    </div>
  );
}
