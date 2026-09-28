"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { PhotoFallback } from "@/components/ui/photo";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatDate } from "@/utils/dates";
import { useIsClient } from "@/hooks/use-is-client";

export type Photo = {
  id: string;
  url: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
  title: string | null;
  caption: string | null;
  takenOn: string | null;
  place?: string | null;
  focus?: string | null;
};

export function Lightbox({ photos, index, onChange, onClose }: { photos: Photo[]; index: number | null; onChange: (i: number) => void; onClose: () => void }) {
  const open = index !== null;
  const isClient = useIsClient();
  const [broken, setBroken] = useState<string | null>(null);
  const go = useCallback(
    (d: number) => {
      if (index === null || !photos.length) return;
      onChange((index + d + photos.length) % photos.length);
    },
    [index, photos.length, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = o;
    };
  }, [open, go, onClose]);

  if (!isClient) return null;
  const p = index !== null ? photos[index] : null;

  return createPortal(
    <AnimatePresence>
      {p && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col bg-black text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={p.title ?? "Foto"}
        >
          <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
            <span className="text-sm font-bold text-white/70">
              {index! + 1} / {photos.length}
            </span>
            <button type="button" onClick={onClose} className="press grid size-11 place-items-center rounded-2xl bg-white/10" aria-label="Chiudi">
              <X className="size-5" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {broken === p.url ? (
                <span key={`${p.id}-x`} className="relative block aspect-square w-[min(80vw,24rem)] overflow-hidden rounded-3xl">
                  <PhotoFallback text="Questa foto non si apre adesso" />
                </span>
              ) : (
              <motion.img
                key={p.id}
                onError={() => setBroken(p.url)}
                src={p.url}
                alt={p.title ?? p.caption ?? "Foto"}
                className="max-h-full max-w-full object-contain select-none"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) go(1);
                  else if (info.offset.x > 60) go(-1);
                }}
                draggable={false}
              />
              )}
            </AnimatePresence>
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="press absolute left-2 hidden size-12 place-items-center rounded-full bg-white/10 sm:grid" aria-label="Precedente">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => go(1)} className="press absolute right-2 hidden size-12 place-items-center rounded-full bg-white/10 sm:grid" aria-label="Successiva">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
          <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-center">
            {p.title && <p className="font-display text-xl font-semibold">{p.title}</p>}
            {p.caption && <p className="mt-1 text-white/75">{p.caption}</p>}
            {(p.takenOn || p.place) && <p className="mt-1 text-sm text-white/50">{[p.takenOn ? formatDate(p.takenOn) : null, p.place].filter(Boolean).join(" · ")}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
