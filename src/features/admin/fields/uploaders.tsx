"use client";

import { useCallback, useRef, useState } from "react";
import { Music, UploadCloud } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";
import { MAX_AUDIO_BYTES } from "@/utils/file-signature";
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
          drag ? "border-wine-500 bg-blush-100" : "border-wine-200 bg-white/60 hover:bg-white",
        )}
      >
        <UploadCloud className="size-8 text-wine-500" />
        <span className="font-bold text-wine-800">Trascina qui le foto o tocca per sceglierle</span>
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
            <li key={i} className="rounded-xl bg-white/80 px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate font-bold text-wine-800">{j.name}</span>
                <span className={j.error ? "text-rouge-600" : "text-ink-muted"}>{j.error ? "errore" : j.done ? "✓" : `${Math.round(j.progress * 100)}%`}</span>
              </div>
              {j.error ? <p className="text-xs text-rouge-600">{j.error}</p> : <div className="mt-1 h-1.5 overflow-hidden rounded bg-wine-100"><div className="h-full bg-wine-500 transition-all" style={{ width: `${j.progress * 100}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Audio uploader: signed direct upload to storage, then server-side validation. */
export function AudioUploader({ onUploaded }: { onUploaded?: (id: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handle = async (file: File) => {
    if (file.size > MAX_AUDIO_BYTES) return toast.show("Audio troppo grande (max 10 MB).", "error");
    setBusy(file.name);
    try {
      const duration = await new Promise<number | undefined>((resolve) => {
        const a = document.createElement("audio");
        a.preload = "metadata";
        a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : undefined);
        a.onerror = () => resolve(undefined);
        a.src = URL.createObjectURL(file);
      });
      const sign = await fetch("/api/admin/media/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "sign", filename: file.name, size: file.size }) }).then((r) => r.json());
      if (sign.error) throw new Error(sign.error);
      const { error } = await getBrowserClient().storage.from("media").uploadToSignedUrl(sign.path, sign.token, file, { contentType: file.type || "audio/mpeg" });
      if (error) throw new Error("Caricamento non riuscito.");
      const fin = await fetch("/api/admin/media/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "finalize", path: sign.path, title: file.name.replace(/\.[^.]+$/, ""), duration }),
      }).then((r) => r.json());
      if (fin.error) throw new Error(fin.error);
      toast.show("Audio caricato ♡");
      onUploaded?.(fin.media.id);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Errore", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <button type="button" onClick={() => input.current?.click()} disabled={Boolean(busy)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-wine-200 bg-white/60 px-4 py-4 font-bold text-wine-800 hover:bg-white disabled:opacity-60">
        <Music className="size-5 text-wine-500" /> {busy ? `Carico ${busy}…` : "Carica un audio (mp3, m4a, ogg, wav · max 10 MB)"}
      </button>
      <input
        ref={input}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/webm,.mp3,.m4a,.aac,.ogg,.wav,.webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
