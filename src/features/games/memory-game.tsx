"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { seededRandom, shuffle } from "@/utils/random";
import { cn } from "@/utils/cn";
import { MEMORY_PAIRS } from "@/features/content/constants";
import { brokenRef, focusPosition, type PhotoSrc } from "@/components/ui/photo";

const FALLBACK = ["💗", "🌸", "⭐", "🌙", "🍓", "🦋"];

type Card = { key: number; face: string; isImage: boolean };

/** Six pairs: as many of their photos as available, emoji for the rest. */
function deal(images: string[], rand: () => number = Math.random): Card[] {
  const photos = shuffle([...new Set(images)], rand).slice(0, MEMORY_PAIRS).map((f) => ({ face: f, isImage: true }));
  const emoji = FALLBACK.slice(0, MEMORY_PAIRS - photos.length).map((f) => ({ face: f, isImage: false }));
  const faces = [...photos, ...emoji];
  return shuffle([...faces, ...faces], rand).map((f, i) => ({ key: i, ...f }));
}

export function MemoryGame({ images: photos, seed }: { images: (string | PhotoSrc)[]; seed: string }) {
  const images = photos.map((p) => (typeof p === "string" ? p : p.url));
  const focusOf = new Map(photos.flatMap((p) => (typeof p === "string" ? [] : [[p.url, p.focus] as const])));
  const [cards, setCards] = useState<Card[]>(() => deal(images, seededRandom(seed)));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const won = cards.length > 0 && matched.size === cards.length / 2;

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (won) track("game_played", { game: "memory", moves });
  }, [won, moves]);

  const flip = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.has(cards[i].face)) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].face === cards[b].face) {
        setMatched((s) => new Set(s).add(cards[a].face));
        setFlipped([]);
        if ("vibrate" in navigator) navigator.vibrate?.(30);
      } else hideTimer.current = setTimeout(() => setFlipped([]), 850);
    }
  };

  const reset = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setCards(deal(images));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
  };

  return (
    <div>
      <HeartBurst show={won} />
      <div className="mb-3 flex items-center justify-between text-sm font-bold text-vio-700">
        <span>Mosse: {moves}</span>
        <span aria-live="polite">
          Coppie: {matched.size}/{cards.length / 2 || MEMORY_PAIRS}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {cards.map((c, i) => {
          const open = flipped.includes(i) || matched.has(c.face);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => flip(i)}
              className="aspect-square [perspective:600px]"
              aria-label={`Carta ${i + 1}: ${matched.has(c.face) ? "coppia trovata" : open ? "scoperta" : "coperta"}`}
            >
              <motion.span className="relative block h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: open ? 180 : 0 }} transition={{ duration: 0.4 }}>
                <span className="absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br from-wine-500 to-wine-700 text-2xl text-white shadow-soft [backface-visibility:hidden]">♡</span>
                <span className={cn("absolute inset-0 grid place-items-center overflow-hidden rounded-2xl bg-surface text-4xl shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)]", matched.has(c.face) && "ring-4 ring-blush-300")}>
                  {c.isImage && !broken.has(c.face) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.face} alt="" className="h-full w-full object-cover" style={{ objectPosition: focusPosition(focusOf.get(c.face)) }} draggable={false} ref={brokenRef(() => setBroken((b) => new Set(b).add(c.face)))} onError={() => setBroken((b) => new Set(b).add(c.face))} />
                  ) : c.isImage ? (
                    "♡"
                  ) : (
                    c.face
                  )}
                </span>
              </motion.span>
            </button>
          );
        })}
      </div>
      {won && <p className="mt-5 text-center font-display text-2xl font-semibold text-vio-900">Brava! In {moves} mosse ♡</p>}
      <Button variant="soft" className="mt-5 w-full" onClick={reset}>
        <RotateCcw className="size-4" /> Nuova partita
      </Button>
    </div>
  );
}
