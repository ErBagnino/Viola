"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Shuffle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { pickAvoiding } from "@/utils/random";
import { COMFORT_CATEGORIES } from "@/features/content/constants";

export type ComfortItem = {
  id: string;
  title: string;
  text: string;
  category: string;
  duration: number | null;
  icon: string | null;
  imageUrl: string | null;
  soundUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  weight: number;
};


const RECENT_KEY = "vio:recent-comfort";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function HelpNow({ items, initialId }: { items: ComfortItem[]; initialId?: string | null }) {
  const [current, setCurrent] = useState<ComfortItem | null>(() => items.find((i) => i.id === initialId) ?? items[0] ?? null);
  const [spin, setSpin] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  const next = useCallback(() => {
    const recent = readRecent();
    const pick = pickAvoiding(items.map((i) => ({ ...i, weight: i.weight })), recent);
    if (!pick) return;
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify([...recent, pick.id].slice(-8)));
    } catch {
      /* ignore */
    }
    setCurrent(pick);
    setSpin((s) => s + 1);
    setTimer(null);
    setRunning(false);
    setDone(false);
  }, [items]);

  useEffect(() => {
    if (!running || timer === null || timer <= 0) return;
    const t = setTimeout(() => {
      const n = timer - 1;
      setTimer(n);
      if (n <= 0 && "vibrate" in navigator) navigator.vibrate?.([80, 60, 80]);
    }, 1000);
    return () => clearTimeout(t);
  }, [running, timer]);

  if (!current) return null;
  const cat = COMFORT_CATEGORIES[current.category] ?? COMFORT_CATEGORIES.practical;

  return (
    <div>
      <HeartBurst show={done} />
      <AnimatePresence mode="wait">
        <motion.article
          key={`${current.id}-${spin}`}
          initial={{ rotateY: 90, opacity: 0, scale: 0.95 }}
          animate={{ rotateY: 0, opacity: 1, scale: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 180 }}
          className="paper relative overflow-hidden rounded-[2rem] p-6"
          style={{ transformPerspective: 900 }}
          aria-live="polite"
        >
          {current.imageUrl && (
            <div className="relative -mx-6 -mt-6 mb-5 aspect-[16/10]">
              <Image src={current.imageUrl} alt="" fill className="object-cover" unoptimized />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${cat.color}`}>{cat.label}</span>
            {current.duration ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-muted">
                <Timer className="size-3.5" /> {current.duration >= 60 ? `${Math.round(current.duration / 60)} min` : `${current.duration} sec`}
              </span>
            ) : null}
          </div>
          <div className="mt-5 grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-blush-100 to-lilac-100 text-vio-600">
            <Icon name={current.icon ?? "sparkles"} className="size-8 text-3xl" />
          </div>
          <h2 className="mt-4 font-display text-[1.75rem] leading-tight font-semibold text-vio-900 text-balance">{current.title}</h2>
          {current.text && <p className="mt-2 text-[17px] leading-relaxed text-ink-soft">{current.text}</p>}

          {current.soundUrl && <audio ref={audio} src={current.soundUrl} controls className="mt-4 w-full" preload="none" />}

          {current.duration ? (
            <div className="mt-5 flex items-center gap-3">
              {timer === null ? (
                <Button
                  variant="soft"
                  onClick={() => {
                    setTimer(current.duration!);
                    setRunning(true);
                  }}
                >
                  <Timer className="size-4" /> Avvia il timer
                </Button>
              ) : (
                <>
                  <span className="font-display text-3xl font-semibold text-vio-800 tabular-nums">{timer > 0 ? fmt(timer) : "Fatto!"}</span>
                  {timer > 0 && (
                    <Button variant="soft" size="icon" onClick={() => setRunning((r) => !r)} aria-label={running ? "Pausa" : "Riprendi"}>
                      {running ? <Pause className="size-5" /> : <Play className="size-5" />}
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : null}

          {current.ctaHref && (
            <Link
              href={current.ctaHref}
              className="press btn-3d mt-6 flex items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-b from-wine-500 to-wine-700 px-6 py-4 font-extrabold text-white"
            >
              {current.ctaLabel || "Andiamo"}
            </Link>
          )}
        </motion.article>
      </AnimatePresence>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="white" size="lg" onClick={next}>
          <Shuffle className="size-5" /> Un&apos;altra
        </Button>
        <Button
          variant="soft"
          size="lg"
          onClick={() => {
            setDone(true);
            track("comfort_done", { action: current.title.slice(0, 60) });
            setTimeout(() => setDone(false), 1400);
          }}
        >
          <Check className="size-5" /> Fatto ♡
        </Button>
      </div>
    </div>
  );
}
