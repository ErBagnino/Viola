"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Eye, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { formatDate } from "@/utils/dates";
import { haptic } from "@/utils/haptics";

export type GuessItem = { id: string; imageUrl: string; question: string; title: string | null; date: string | null; place: string | null; text: string | null };

/** "Indovina il ricordo": a blurred photo, a question, then the reveal. */
export function GuessMemory({ items }: { items: GuessItem[] }) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const item = items[i % items.length];

  const reveal = () => {
    setRevealed(true);
    haptic("success");
    track("game_played", { game: "guess_memory" });
  };
  const next = () => {
    setRevealed(false);
    setI((v) => v + 1);
  };

  return (
    <div className="flex flex-col items-center">
      <HeartBurst show={revealed} count={10} />
      <AnimatePresence mode="wait">
        <motion.figure
          key={`${item.id}-${i}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="polaroid w-full max-w-sm rounded-md p-3 pb-5 shadow-float"
        >
          <div className="relative overflow-hidden rounded-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={revealed ? (item.title ?? "Un nostro ricordo") : "Foto sfocata: prova a indovinare"}
              className="aspect-[4/5] w-full object-cover transition-[filter] duration-700 ease-out"
              style={{ filter: revealed ? "none" : "blur(18px) saturate(1.1)" }}
            />
            {!revealed && <span className="absolute inset-0 grid place-items-center font-display text-5xl text-white drop-shadow">?</span>}
          </div>
          <figcaption className="mt-3 text-center">
            {revealed ? (
              <>
                <p className="font-hand text-2xl text-vio-800">{item.title || "Noi ♡"}</p>
                <p className="text-xs font-bold text-ink-muted">{[item.place, item.date ? formatDate(item.date) : null].filter(Boolean).join(" · ")}</p>
                {item.text && <p className="mt-2 line-clamp-4 text-sm text-ink-soft">{item.text}</p>}
              </>
            ) : (
              <p className="font-display text-xl text-vio-900">{item.question}</p>
            )}
          </figcaption>
        </motion.figure>
      </AnimatePresence>
      <div className="mt-6 grid w-full max-w-sm gap-2">
        {revealed ? (
          <Button size="lg" onClick={next} disabled={items.length < 2}>
            <Shuffle className="size-5" /> Un altro ricordo
          </Button>
        ) : (
          <Button size="lg" onClick={reveal}>
            <Eye className="size-5" /> Svela
          </Button>
        )}
      </div>
    </div>
  );
}
