"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Icon } from "@/components/ui/icon";
import { toneClass, isDarkTone } from "@/components/ui/card";
import { LetterView } from "@/features/letters/letter-view";
import { cn } from "@/utils/cn";
import { markOpenWhenOpened } from "./actions";
import { callQuietly } from "@/utils/call-action";
import { haptic } from "@/utils/haptics";

export type OpenWhenCard = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  audioUrl: string | null;
  animation: string;
  ctaHref: string | null;
  ctaLabel: string | null;
  color: string | null;
  icon: string | null;
  openedCount: number;
};

function Burst({ kind }: { kind: string }) {
  if (kind === "none") return null;
  const glyph = kind === "stars" ? "✦" : kind === "petals" ? "❀" : "♥";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden" aria-hidden>
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span
          key={i}
          className={cn("absolute text-xl", kind === "stars" ? "text-peach-300" : kind === "petals" ? "text-blush-300" : "text-rouge-400")}
          style={{ left: `${(i * 71) % 100}%` }}
          initial={{ y: 140, opacity: 0, rotate: 0 }}
          animate={{ y: -20, opacity: [0, 1, 0], rotate: 180 }}
          transition={{ duration: 2.2, delay: i * 0.08 }}
        >
          {glyph}
        </motion.span>
      ))}
    </div>
  );
}

export function OpenWhenGrid({ cards, signature }: { cards: OpenWhenCard[]; signature: string }) {
  const [open, setOpen] = useState<OpenWhenCard | null>(null);
  const openCard = (c: OpenWhenCard) => {
    setOpen(c);
    haptic("heart");
    void callQuietly(() => markOpenWhenOpened(c.id));
  };
  // "Scegli tu per me": one of the envelopes opened the fewest times (never-opened first).
  const chooseForMe = () => {
    const least = Math.min(...cards.map((c) => c.openedCount));
    const pool = cards.filter((c) => c.openedCount === least);
    openCard(pool[Math.floor(Math.random() * pool.length)]);
  };
  return (
    <>
      {cards.length > 1 && (
        <button type="button" onClick={chooseForMe} className="press paper mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 font-bold text-vio-800">
          <Icon name="shuffle" className="size-4 text-base" /> Scegli tu per me
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c, i) => {
          const dark = isDarkTone(c.color);
          return (
            <motion.button
              key={c.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95, rotate: -1 }}
              onClick={() => openCard(c)}
              className={cn("relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-4 text-left shadow-soft", toneClass(c.color))}
            >
              <span className="absolute inset-x-0 top-0 h-1/2 bg-white/25 [clip-path:polygon(0_0,100%_0,50%_75%)]" aria-hidden />
              <span className={cn("absolute top-[30%] left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full text-lg shadow", dark ? "bg-surface text-vio-700" : "bg-wine-600 text-white")} aria-hidden>
                <Icon name={c.icon ?? "heart"} className="size-5" />
              </span>
              <span className="absolute inset-x-4 bottom-4">
                <span className={cn("block text-[11px] font-extrabold tracking-widest uppercase", dark ? "text-white/70" : "text-vio-500")}>Aprimi quando…</span>
                <span className="mt-1 block text-[15px] leading-snug font-extrabold text-balance">{c.title.replace(/^aprimi quando\s*/i, "")}</span>
              </span>
              {c.openedCount === 0 && <span className="absolute top-3 right-3 rounded-full bg-rouge-500 px-2 py-0.5 text-[10px] font-extrabold text-white">NUOVA</span>}
            </motion.button>
          );
        })}
      </div>
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)}>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
              <Burst kind={open.animation} />
              <LetterView title={open.title} body={open.body} image={open.imageUrl ? { url: open.imageUrl } : null} audioUrl={open.audioUrl} signature={signature} />
              {open.ctaHref && (
                <Link href={open.ctaHref} className="press btn-3d mt-6 block rounded-[1.25rem] bg-gradient-to-b from-wine-500 to-wine-700 px-6 py-4 text-center font-extrabold text-white">
                  {open.ctaLabel ?? "Andiamo ♡"}
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Sheet>
    </>
  );
}
