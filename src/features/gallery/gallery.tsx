"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Chip, Segmented } from "@/components/ui/fields";
import { formatDate } from "@/utils/dates";
import { Photo as PhotoFrame } from "@/components/ui/photo";
import { Lightbox, type Photo } from "./lightbox";

type Layout = "polaroid" | "masonry" | "timeline" | "fullscreen";
export type GalleryPhoto = Photo & { category: string | null; featured: boolean };

const tilt = (i: number) => ((i * 37) % 7) - 3;

export function Gallery({ photos, categories }: { photos: GalleryPhoto[]; categories: string[] }) {
  const [layout, setLayout] = useState<Layout>("polaroid");
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const list = useMemo(() => (cat ? photos.filter((p) => p.category === cat) : photos), [photos, cat]);

  const byYear = useMemo(() => {
    const groups = new Map<string, { p: GalleryPhoto; i: number }[]>();
    list.forEach((p, i) => {
      const k = p.takenOn ? p.takenOn.slice(0, 7) : "senza data";
      groups.set(k, [...(groups.get(k) ?? []), { p, i }]);
    });
    return [...groups];
  }, [list]);

  return (
    <div>
      <Segmented
        label="Disposizione"
        value={layout}
        onChange={setLayout}
        options={[
          { value: "polaroid", label: "Polaroid" },
          { value: "masonry", label: "Mosaico" },
          { value: "timeline", label: "Tempo" },
          { value: "fullscreen", label: "Grande" },
        ]}
      />
      {categories.length > 1 && (
        <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip active={cat === null} onClick={() => setCat(null)}>
            Tutte
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-5">
        {layout === "polaroid" && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {list.map((p, i) => (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => setOpen(i)}
                initial={{ opacity: 0, y: 12, rotate: 0 }}
                animate={{ opacity: 1, y: 0, rotate: tilt(i) }}
                whileTap={{ scale: 0.96, rotate: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className="polaroid rounded-md p-2 pb-3 text-left shadow-soft"
                aria-label={p.title ?? "Apri foto"}
              >
                <PhotoFrame photo={p} alt={p.title ?? ""} frame={1} useThumb className="w-full rounded-sm" />
                <span className="mt-2 block truncate text-center font-hand text-xl text-vio-800">{p.title || formatDate(p.takenOn, { month: "short", year: "numeric" }) || "♡"}</span>
              </motion.button>
            ))}
          </div>
        )}

        {layout === "masonry" && (
          <div className="columns-2 gap-3 sm:columns-3">
            {list.map((p, i) => (
              <button key={p.id} type="button" onClick={() => setOpen(i)} className="press mb-3 block w-full overflow-hidden rounded-3xl shadow-soft" aria-label={p.title ?? "Apri foto"}>
                <PhotoFrame photo={p} alt={p.title ?? ""} frame="natural" minRatio={9 / 16} maxRatio={2.4} useThumb className="w-full" />
              </button>
            ))}
          </div>
        )}

        {layout === "timeline" && (
          <ol className="relative space-y-6 border-l-2 border-dashed border-tint-200 pl-5">
            {byYear.map(([k, items]) => (
              <li key={k}>
                <span className="absolute -left-[9px] mt-1.5 size-4 rounded-full border-4 border-cream-100 bg-wine-500" aria-hidden />
                <h3 className="font-display text-lg font-semibold text-vio-800 capitalize">
                  {k === "senza data" ? k : formatDate(`${k}-15`, { month: "long", year: "numeric" })}
                </h3>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {items.map(({ p, i }) => (
                    <button key={p.id} type="button" onClick={() => setOpen(i)} className="press overflow-hidden rounded-2xl" aria-label={p.title ?? "Apri foto"}>
                      <PhotoFrame photo={p} alt={p.title ?? ""} frame={1} useThumb className="w-full" />
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}

        {layout === "fullscreen" && (
          <div className="space-y-5">
            {list.map((p, i) => (
              <figure key={p.id} className="paper overflow-hidden rounded-4xl">
                <button type="button" onClick={() => setOpen(i)} className="block w-full" aria-label={p.title ?? "Apri foto"}>
                  <PhotoFrame photo={p} alt={p.title ?? ""} frame="natural" className="w-full" />
                </button>
                {(p.title || p.caption || p.place) && (
                  <figcaption className="p-4">
                    {p.title && <p className="font-display text-lg font-semibold text-vio-900">{p.title}</p>}
                    {p.caption && <p className="text-sm text-ink-soft">{p.caption}</p>}
                    {(p.takenOn || p.place) && <p className="mt-1 text-xs font-bold text-vio-500">{[p.takenOn ? formatDate(p.takenOn) : null, p.place].filter(Boolean).join(" · ")}</p>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>

      <Lightbox photos={list} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}
