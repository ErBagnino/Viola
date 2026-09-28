"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Gift, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { HeartBurst } from "@/components/decor/burst";
import { Sparkle } from "@/components/decor/stars";
import { track } from "@/features/activity/track";
import { shuffle } from "@/utils/random";
import { Photo, type PhotoSrc } from "@/components/ui/photo";

export type SurpriseItem = {
  type: string;
  eyebrow: string;
  title: string;
  text?: string | null;
  imageUrl?: string | null;
  photo?: PhotoSrc | null;
  href?: string | null;
  ctaLabel?: string | null;
};

const RECENT = "vio:recent-surprise-types";

export function SurpriseBox({ items }: { items: SurpriseItem[] }) {
  const [current, setCurrent] = useState<SurpriseItem | null>(null);
  const [opening, setOpening] = useState(false);

  const open = () => {
    setOpening(true);
    let recent: string[] = [];
    try {
      recent = JSON.parse(localStorage.getItem(RECENT) ?? "[]");
    } catch {
      /* ignore */
    }
    const fresh = items.filter((i) => !recent.slice(-2).includes(`${i.type}:${i.title}`));
    const pick = shuffle(fresh.length ? fresh : items)[0];
    setTimeout(() => {
      setCurrent(pick);
      setOpening(false);
      track("surprise_opened", { type: pick.type });
      try {
        localStorage.setItem(RECENT, JSON.stringify([...recent, `${pick.type}:${pick.title}`].slice(-6)));
      } catch {
        /* ignore */
      }
    }, 900);
  };

  return (
    <div className="flex flex-col items-center">
      <HeartBurst show={Boolean(current)} />
      <AnimatePresence mode="wait">
        {!current ? (
          <motion.button
            key="box"
            type="button"
            onClick={open}
            disabled={opening}
            className="relative mt-6 grid size-64 place-items-center"
            animate={opening ? { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.05, 1.1, 1.15, 1.2, 0.2], opacity: [1, 1, 1, 1, 1, 0] } : { y: [0, -8, 0] }}
            transition={opening ? { duration: 0.9 } : { duration: 3, repeat: Infinity }}
            exit={{ opacity: 0 }}
            aria-label="Apri la sorpresa"
          >
            <Sparkle className="absolute top-2 left-6 size-6 animate-twinkle text-peach-400" />
            <Sparkle className="absolute right-4 bottom-10 size-5 animate-twinkle text-lilac-400 [animation-delay:500ms]" />
            <span className="relative grid size-48 place-items-center rounded-[2.5rem] bg-gradient-to-br from-rouge-400 to-wine-700 text-white shadow-float">
              <span className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-blush-200/90" />
              <span className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 bg-blush-200/90" />
              <Gift className="relative size-16" strokeWidth={1.6} />
            </span>
            <span className="absolute -bottom-6 font-display text-xl font-semibold text-vio-800">Toccami ♡</span>
          </motion.button>
        ) : (
          <motion.article
            key="content"
            initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 14 }}
            className="paper mt-2 w-full overflow-hidden rounded-[2rem]"
          >
            {current.imageUrl && <Photo photo={current.photo ?? { url: current.imageUrl }} alt="" frame={4 / 3} className="w-full" />}
            <div className="p-6">
              <p className="font-hand text-2xl text-vio-500">{current.eyebrow}</p>
              <h2 className="mt-1 font-display text-[1.7rem] leading-tight font-semibold text-vio-900">{current.title}</h2>
              {current.text && <Markdown className="mt-3 text-[16px] text-ink-soft">{current.text}</Markdown>}
              {current.href && (
                <Link href={current.href} className="press btn-3d mt-5 block rounded-[1.25rem] bg-gradient-to-b from-wine-500 to-wine-700 px-6 py-4 text-center font-extrabold text-white">
                  {current.ctaLabel ?? "Apri"}
                </Link>
              )}
            </div>
          </motion.article>
        )}
      </AnimatePresence>
      {current && (
        <Button variant="soft" size="lg" className="mt-5 w-full" onClick={() => setCurrent(null)}>
          <RotateCcw className="size-5" /> Un&apos;altra sorpresa
        </Button>
      )}
    </div>
  );
}
