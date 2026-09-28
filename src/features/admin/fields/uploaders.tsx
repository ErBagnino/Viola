"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";
import { compressImage, uploadPhoto } from "./image-compress";

type Job = { name: string; progress: number; error?: string; done?: boolean };

/** Multi-file photo uploader with drag & drop and per-file progress. */
export function ImageUploader({
  meta,
  onUploaded,
  compact,
}: {
  meta?: Record<string, unknown>;
  onUploaded?: (ids: string[]) => void;
  compact?: boolean;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handle = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
      if (!list.length) return toast.show("Scegli delle foto (JPEG, PNG o WEBP).", "error");
      setJobs(list.map((f) => ({ name: f.name, progress: 0 })));
      const ids: string[] = [];
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const blob = await compressImage(f);
        const res = await uploadPhoto(blob, f.name, meta ?? {}, (p) => setJobs((js) => js.map((j, k) => (k === i ? { ...j, progress: p } : j))));
        setJobs((js) => js.map((j, k) => (k === i ? { ...j, progress: 1, done: !res.error, error: res.error } : j)));
        if (res.media?.id) ids.push(res.media.id);
      }
      if (ids.length) {
        toast.show(ids.length === 1 ? "Foto caricata ♡" : `${ids.length} foto caricate ♡`);
        onUploaded?.(ids);
      }
      setTimeout(() => setJobs((js) => js.filter((j) => j.error)), 2500);
    },
    [meta, onUploaded, toast],
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-4 text-center transition",
          compact ? "py-5" : "py-10",
          drag ? "border-wine-500 bg-blush-100" : "border-tint-200 bg-surface/60 hover:bg-surface",
        )}
      >
        <UploadCloud className="size-8 text-vio-500" />
        <span className="font-bold text-vio-800">Trascina qui le foto o tocca per sceglierle</span>
        <span className="text-xs text-ink-muted">JPEG, PNG o WEBP · più foto insieme · ottimizzate automaticamente</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handle(e.target.files);
          e.target.value = "";
        }}
      />
      {jobs.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {jobs.map((j, i) => (
            <li key={i} className="rounded-xl bg-surface/80 px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate font-bold text-vio-800">{j.name}</span>
                <span className={j.error ? "text-rouge-600" : "text-ink-muted"}>{j.error ? "errore" : j.done ? "✓" : `${Math.round(j.progress * 100)}%`}</span>
              </div>
              {j.error ? <p className="text-xs text-rouge-600">{j.error}</p> : <div className="mt-1 h-1.5 overflow-hidden rounded bg-tint-100"><div className="h-full bg-wine-500 transition-all" style={{ width: `${j.progress * 100}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
