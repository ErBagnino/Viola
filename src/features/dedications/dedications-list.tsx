"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Chip } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LetterView } from "@/features/letters/letter-view";
import type { PhotoSrc } from "@/components/ui/photo";
import { track } from "@/features/activity/track";
import { pickAvoiding } from "@/utils/random";
import { DEDICATION_CATEGORIES } from "@/features/content/constants";

export type DedicationView = {
  id: string;
  title: string;
  body: string;
  category: string;
  imageUrl: string | null;
  photo?: PhotoSrc | null;
  audioUrl: string | null;
  signature: string;
  pinned: boolean;
};


const RECENT = "vio:recent-dedications";

export function DedicationsList({ items, initialOpenId, eyebrow }: { items: DedicationView[]; initialOpenId?: string | null; eyebrow: string }) {
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpenState] = useState<DedicationView | null>(() => items.find((d) => d.id === initialOpenId) ?? null);
  const setOpen = (d: DedicationView | null) => {
    if (d) track("dedication_opened", { id: d.id });
    setOpenState(d);
  };
  const list = useMemo(() => (cat ? items.filter((d) => d.category === cat) : items), [items, cat]);
  const cats = useMemo(() => Array.from(new Set(items.map((d) => d.category))), [items]);

  const random = () => {
    let recent: string[] = [];
    try {
      recent = JSON.parse(localStorage.getItem(RECENT) ?? "[]");
    } catch {
      /* ignore */
    }
    const pick = pickAvoiding(list, recent);
    if (!pick) return;
    try {
      localStorage.setItem(RECENT, JSON.stringify([...recent, pick.id].slice(-6)));
    } catch {
      /* ignore */
    }
    setOpen(pick);
  };

  return (
    <div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={cat === null} onClick={() => setCat(null)}>
          Tutte
        </Chip>
        {cats.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {DEDICATION_CATEGORIES[c] ?? c}
          </Chip>
        ))}
      </div>

      <Button variant="soft" className="mt-3 w-full" onClick={random}>
        <Shuffle className="size-4" /> Aprine una a caso
      </Button>

      <div className="mt-4 grid gap-3">
        {list.map((d, i) => (
          <motion.button
            key={d.id}
            type="button"
            onClick={() => setOpen(d)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden rounded-[1.75rem] bg-surface p-5 text-left shadow-soft"
          >
            {/* envelope flap */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-blush-100 to-transparent [clip-path:polygon(0_0,100%_0,50%_100%)]" aria-hidden />
            <span className="relative">
              <span className="block text-xs font-extrabold tracking-widest text-vio-500 uppercase">{DEDICATION_CATEGORIES[d.category] ?? d.category}</span>
              <span className="mt-1 block font-display text-xl font-semibold text-vio-900">
                {d.pinned && "♥ "}
                {d.title}
              </span>
              <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{d.body.replace(/[#*_>`-]/g, "").slice(0, 160)}</span>
            </span>
          </motion.button>
        ))}
      </div>

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)}>
        {open && (
          <LetterView
            eyebrow={eyebrow}
            title={open.title}
            body={open.body}
            image={open.photo ?? (open.imageUrl ? { url: open.imageUrl } : null)}
            audioUrl={open.audioUrl}
            signature={open.signature}
          />
        )}
      </Sheet>
    </div>
  );
}
