"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BreathingSession } from "./breathing-session";
import { BreathingVisual } from "./breathing-visual";
import { BREATHING_VISUALS, type BreathingPhoto, type BreathingPresetView } from "./types";
import { cn } from "@/utils/cn";

function describe(p: BreathingPresetView) {
  const parts = [`${p.inhale}s dentro`];
  if (p.hold) parts.push(`${p.hold}s fermo`);
  parts.push(`${p.exhale}s fuori`);
  if (p.holdAfter) parts.push(`${p.holdAfter}s pausa`);
  return parts.join(" · ");
}

export function BreathingExperience({
  presets,
  photos,
  phrases,
  endText,
  autoStart,
  tone,
}: {
  presets: BreathingPresetView[];
  photos: BreathingPhoto[];
  phrases: string[];
  endText: string;
  autoStart?: boolean;
  tone?: "light" | "night";
}) {
  const initial = presets[0];
  const [selected, setSelected] = useState<BreathingPresetView>(initial);
  const [visual, setVisual] = useState(initial?.visual ?? "heart");
  const [withPhotos, setWithPhotos] = useState(true);
  const [running, setRunning] = useState(Boolean(autoStart));

  if (!selected) return null;

  const active = { ...selected, visual, showPhotos: selected.showPhotos && withPhotos };

  return (
    <>
      <div className="grid place-items-center py-2">
        <div className="aspect-square w-48">
          <BreathingVisual visual={visual} expansion={0.55} photoUrl={withPhotos && selected.showPhotos ? photos[0]?.url : null} blur={6} />
        </div>
      </div>

      <section aria-label="Scegli il respiro" className="mt-2 space-y-2">
        {presets.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelected(p);
              setVisual(p.visual);
            }}
            aria-pressed={selected.id === p.id}
            className={cn(
              "w-full rounded-3xl border-2 p-4 text-left transition",
              selected.id === p.id ? "border-wine-500 bg-white shadow-soft" : "border-transparent bg-white/60",
            )}
          >
            <span className="block font-extrabold text-wine-900">{p.name}</span>
            <span className="block text-sm text-ink-soft">{p.description || describe(p)}</span>
            <span className="mt-1 block text-xs font-bold text-wine-500">
              {describe(p)}
              {p.rounds ? ` · ${p.rounds} respiri` : " · libero"}
            </span>
          </motion.button>
        ))}
      </section>

      <section className="mt-5" aria-label="Forma">
        <p className="mb-2 px-1 text-xs font-extrabold tracking-widest text-wine-500 uppercase">Forma</p>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {BREATHING_VISUALS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setVisual(v.value)}
              aria-pressed={visual === v.value}
              className={cn(
                "press shrink-0 rounded-full px-4 py-2 text-sm font-bold",
                visual === v.value ? "bg-wine-700 text-white" : "bg-white/70 text-wine-700",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        {photos.length > 0 && selected.showPhotos && (
          <label className="mt-3 flex items-center gap-2 px-1 text-sm font-bold text-wine-800">
            <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} className="size-5 accent-wine-600" />
            Con le nostre foto
          </label>
        )}
      </section>

      <div className="sticky bottom-24 mt-6 lg:bottom-6">
        <Button size="xl" className="w-full" onClick={() => setRunning(true)}>
          <Play className="size-5" /> Respira con me
        </Button>
      </div>

      {running && (
        <BreathingSession
          key={`${selected.id}-${visual}`}
          preset={active}
          photos={photos}
          phrases={active.texts.length ? active.texts : phrases}
          endText={endText}
          onClose={() => setRunning(false)}
          tone={tone}
        />
      )}
    </>
  );
}
