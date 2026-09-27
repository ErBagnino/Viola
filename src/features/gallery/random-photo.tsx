"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sparkle, Star5 } from "@/components/decor/stars";
import { formatDate } from "@/utils/dates";
import { pickAvoiding, pickOne } from "@/utils/random";
import type { GalleryPhoto } from "./gallery";

const RECENT = "vio:recent-photos";

export function RandomPhoto({ photos, phrases, initialPhrase }: { photos: GalleryPhoto[]; phrases: string[]; initialPhrase: string }) {
  const [photo, setPhoto] = useState<GalleryPhoto | null>(photos[0] ?? null);
  const [phrase, setPhrase] = useState<string>(initialPhrase);
  const [n, setN] = useState(0);

  const next = useCallback(() => {
    let recent: string[] = [];
    try {
      recent = JSON.parse(localStorage.getItem(RECENT) ?? "[]");
    } catch {
      /* ignore */
    }
    const p = pickAvoiding(photos, recent);
    if (!p) return;
    try {
      localStorage.setItem(RECENT, JSON.stringify([...recent, p.id].slice(-12)));
    } catch {
      /* ignore */
    }
    setPhoto(p);
    setPhrase(pickOne(phrases) ?? "");
    setN((v) => v + 1);
  }, [photos, phrases]);

  if (!photo) return null;
  return (
    <div className="flex flex-col items-center">
      <div className="relative mt-2 w-full max-w-sm">
        <Star5 className="absolute -top-3 -right-2 z-10 size-10 rotate-12" />
        <Sparkle outline className="absolute -bottom-3 -left-2 z-10 size-7 text-white" />
        <AnimatePresence mode="wait">
          <motion.figure
            key={`${photo.id}-${n}`}
            initial={{ rotate: -8, y: 40, opacity: 0, scale: 0.9 }}
            animate={{ rotate: n % 2 ? 2 : -2, y: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 10, x: 120, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 160 }}
            className="polaroid rounded-md p-3 pb-5 shadow-float"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.title ?? "Noi"} className="aspect-[4/5] w-full rounded-sm object-cover" />
            <figcaption className="mt-3 text-center">
              <p className="font-hand text-2xl text-vio-800">{photo.title || photo.caption || "Noi ♡"}</p>
              {photo.takenOn && <p className="text-xs font-bold text-ink-muted">{formatDate(photo.takenOn)}</p>}
              {photo.caption && photo.title && <p className="mt-1 text-sm text-ink-soft">{photo.caption}</p>}
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      {phrase && <p className="mt-6 max-w-xs text-center font-display text-xl text-vio-800 italic">{phrase}</p>}
      <Button size="lg" className="mt-6 w-full max-w-sm" onClick={next} disabled={photos.length < 2}>
        <Shuffle className="size-5" /> Un&apos;altra
      </Button>
    </div>
  );
}
