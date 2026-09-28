"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { MapPin, Shuffle } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { formatDate } from "@/utils/dates";
import { pickOne } from "@/utils/random";
import { MEMORY_KINDS } from "@/features/content/constants";
import { Photo, type PhotoSrc } from "@/components/ui/photo";

export type MemoryItem = {
  id: string;
  title: string;
  body: string;
  kind: string;
  happenedOn: string | null;
  place: string | null;
  imageUrl: string | null;
  photo?: PhotoSrc | null;
  important: boolean;
};


export type TimelineNow = { nextTitle: string | null; nextLabel: string | null };

export function MemoryTimeline({ items, initialOpenId, now }: { items: MemoryItem[]; initialOpenId?: string | null; now?: TimelineNow }) {
  const [open, setOpen] = useState<MemoryItem | null>(() => items.find((m) => m.id === initialOpenId) ?? null);

  return (
    <div>
      <Button variant="soft" className="mb-5 w-full" onClick={() => setOpen(pickOne(items))}>
        <Shuffle className="size-4" /> Un ricordo a caso
      </Button>
      <ol className="relative ml-3 space-y-5 border-l-2 border-dashed border-tint-200 pl-6">
        {now?.nextTitle && (
          <li className="relative">
            <span className="absolute top-2 -left-[2.35rem] grid size-8 place-items-center rounded-full bg-surface text-base shadow-soft" aria-hidden>
              ⏳
            </span>
            <p className="text-xs font-extrabold tracking-widest text-vio-500 uppercase">Prossimo</p>
            <p className="font-display text-lg font-semibold text-vio-900">{now.nextTitle}</p>
            {now.nextLabel && <p className="text-sm text-ink-soft">{now.nextLabel}</p>}
          </li>
        )}
        {now && (
          <li className="relative">
            <span className="absolute top-1/2 -left-[2.45rem] grid size-9 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-b from-rouge-400 to-rouge-600 text-white shadow-glow" aria-hidden>
              ♥
            </span>
            <p className="inline-flex rounded-full bg-night-900 px-4 py-1.5 text-sm font-bold text-moon">Sei qui ♡ · oggi</p>
          </li>
        )}
        {items.map((m, i) => {
          const k = MEMORY_KINDS[m.kind] ?? MEMORY_KINDS.other;
          return (
            <motion.li key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.05, 0.5) }} className="relative">
              <span className="absolute top-3 -left-[2.35rem] grid size-8 place-items-center rounded-full bg-surface text-base shadow-soft" aria-hidden>
                {k.emoji}
              </span>
              <button type="button" onClick={() => setOpen(m)} className="press paper block w-full overflow-hidden rounded-[1.75rem] text-left">
                {m.imageUrl && <Photo photo={m.photo ?? { url: m.imageUrl }} alt="" frame={16 / 9} useThumb className="w-full" />}
                <span className="block p-4">
                  <span className="block text-xs font-extrabold tracking-widest text-vio-500 uppercase">
                    {k.label}
                    {m.happenedOn && ` · ${formatDate(m.happenedOn)}`}
                  </span>
                  <span className="mt-1 block font-display text-xl font-semibold text-vio-900">
                    {m.important && "♥ "}
                    {m.title}
                  </span>
                  {m.place && (
                    <span className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
                      <MapPin className="size-3.5" /> {m.place}
                    </span>
                  )}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)}>
        {open && (
          <article>
            <p className="text-xs font-extrabold tracking-widest text-vio-500 uppercase">
              {(MEMORY_KINDS[open.kind] ?? MEMORY_KINDS.other).label}
              {open.happenedOn && ` · ${formatDate(open.happenedOn)}`}
            </p>
            <h2 className="mt-1 font-display text-[1.7rem] leading-tight font-semibold text-vio-900">{open.title}</h2>
            {open.place && (
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
                <MapPin className="size-4" /> {open.place}
              </p>
            )}
            {open.imageUrl && <Photo photo={open.photo ?? { url: open.imageUrl }} alt={open.title} frame="natural" className="mt-4 w-full rounded-3xl" />}
            {open.body && <Markdown className="mt-4 text-[17px]">{open.body}</Markdown>}
          </article>
        )}
      </Sheet>
    </div>
  );
}
