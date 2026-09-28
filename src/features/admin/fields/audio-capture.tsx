"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FolderOpen, Mic, Music, Pause, Play, RotateCcw, Square, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/dates";
import {
  AUDIO_ACCEPT,
  AUDIO_FORMATS_LABEL,
  audioFileProblem,
  formatBytes,
  formatDuration,
  MAX_RECORDING_SECONDS,
  mayNotPlayOnIphone,
  recordingTitle,
  titleFromFileName,
} from "@/utils/audio-formats";
import { uploadAudio, type DuplicateAudio, type UploadResume } from "./audio-upload";
import { canRecordAudio, useAudioRecorder } from "./use-audio-recorder";

// ---------------------------------------------------------------------------
// "Aggiungi un audio": record now or pick a file (iPhone: the Files app, e.g.
// a Voice Memo saved with Condividi → Salva su File), listen to it, give it a
// title, save. Nothing is uploaded until "Salva audio".
// ---------------------------------------------------------------------------

export type SavedAudio = { id: string; title: string | null };

type Draft = { file: File; url: string; duration: number | null; source: "file" | "recording" };
type Upload = { progress: number; error?: string; duplicate?: DuplicateAudio };

const noop = () => () => {};
const isAppleMobile = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function AudioCapture({
  onSaved,
  heading = "Aggiungi un audio",
  timeZone = "Europe/Rome",
  askTitle = true,
}: {
  onSaved: (m: SavedAudio) => void;
  heading?: string;
  timeZone?: string;
  /** false inside a form that has its own title (it gets this one as a start) */
  askTitle?: boolean;
}) {
  const ios = useSyncExternalStore(noop, isAppleMobile, () => false);
  const canRecord = useSyncExternalStore(noop, canRecordAudio, () => false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [unplayable, setUnplayable] = useState(false);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const resume = useRef<UploadResume | null>(null);
  // keyboard / VoiceOver: each step replaces the buttons of the previous one, so move focus along
  const stopRef = useRef<HTMLButtonElement | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const wasRecording = useRef(false);

  const showDraft = (d: Draft, defaultTitle: string) => {
    resume.current = null;
    setProblem(null);
    setUnplayable(false);
    setUpload(null);
    setDraft(d);
    setTitle(defaultTitle);
  };

  const recorder = useAudioRecorder((r) => {
    showDraft({ file: r.file, url: URL.createObjectURL(r.file), duration: r.duration || null, source: "recording" }, recordingTitle(new Date(), timeZone));
  });

  // Free the in-memory copy of the audio when it is replaced or discarded.
  useEffect(() => {
    const url = draft?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [draft?.url]);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    const recording = recorder.state === "recording" || recorder.state === "paused";
    if (recording && !wasRecording.current) stopRef.current?.focus();
    wasRecording.current = recording;
  }, [recorder.state]);
  useEffect(() => {
    if (draft?.url) previewRef.current?.focus();
  }, [draft?.url]);

  const pickFile = (file: File | undefined | null) => {
    if (!file) return;
    const why = audioFileProblem(file);
    if (why) {
      setProblem(why);
      return;
    }
    showDraft({ file, url: URL.createObjectURL(file), duration: null, source: "file" }, titleFromFileName(file.name));
  };

  const discard = () => {
    abort.current?.abort();
    resume.current = null;
    setDraft(null);
    setUpload(null);
    setTitle("");
  };

  const save = async (allowDuplicate = false) => {
    if (!draft || busy.current) return; // a double tap never sends the audio twice
    busy.current = true;
    const ctrl = new AbortController();
    abort.current = ctrl;
    setUpload({ progress: 0 });
    const res = await uploadAudio({
      file: draft.file,
      filename: draft.file.name,
      title: title || titleFromFileName(draft.file.name),
      duration: draft.duration,
      allowDuplicate,
      resume: resume.current,
      onResume: (r) => (resume.current = r),
      onProgress: (p) => setUpload((u) => (u && !u.error ? { ...u, progress: p } : u)),
      signal: ctrl.signal,
    });
    busy.current = false;
    abort.current = null;
    if (res.ok) {
      resume.current = null;
      setDraft(null);
      setUpload(null);
      setTitle("");
      onSaved({ id: res.media.id, title: res.media.title });
    } else if ("duplicate" in res) setUpload({ progress: 0, duplicate: res.duplicate });
    else if (res.aborted) setUpload(null);
    else setUpload({ progress: 0, error: res.error });
  };

  // --- recording ------------------------------------------------------------
  if (recorder.state === "recording" || recorder.state === "paused" || recorder.state === "asking") {
    const paused = recorder.state === "paused";
    return (
      <section className="rounded-3xl border border-blush-200 bg-surface p-5 text-center" aria-label="Registrazione">
        <p className="flex items-center justify-center gap-2 text-sm font-extrabold text-rouge-600">
          <span className={cn("size-3 rounded-full bg-rouge-500", !paused && "motion-safe:animate-pulse")} aria-hidden />
          {recorder.state === "asking" ? "Chiedo il permesso per il microfono…" : paused ? "In pausa" : "Sto registrando"}
        </p>
        <p role="timer" aria-label={`Durata ${formatDuration(recorder.elapsed)}`} className="mt-2 font-display text-5xl font-semibold text-vio-900 tabular-nums">
          {formatDuration(recorder.elapsed)}
        </p>
        <div className="mx-auto mt-3 h-2 w-40 overflow-hidden rounded-full bg-tint-100" aria-hidden>
          <div className="h-full rounded-full bg-rouge-500 transition-[width] duration-75" style={{ width: `${Math.round((paused ? 0 : recorder.level) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-muted">Al massimo {MAX_RECORDING_SECONDS / 60} minuti</p>
        <div className="mt-4 flex justify-center gap-2">
          {recorder.canPause && recorder.state !== "asking" && (
            <Button variant="soft" onClick={paused ? recorder.resume : recorder.pause}>
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />} {paused ? "Riprendi" : "Pausa"}
            </Button>
          )}
          <Button ref={stopRef} onClick={recorder.stop} disabled={recorder.state === "asking"}>
            <Square className="size-4 fill-current" /> Fine
          </Button>
        </div>
        <button type="button" onClick={recorder.cancel} className="mt-3 text-sm font-bold text-ink-muted underline-offset-2 hover:underline">
          Annulla registrazione
        </button>
      </section>
    );
  }

  // --- preview + save --------------------------------------------------------
  if (draft) {
    const uploading = Boolean(upload && !upload.error && !upload.duplicate);
    const pct = Math.round((upload?.progress ?? 0) * 100);
    return (
      <section ref={previewRef} tabIndex={-1} className="space-y-3 rounded-3xl border border-blush-200 bg-surface p-4 outline-none" aria-label="Anteprima audio">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blush-100 text-vio-600">
            {draft.source === "recording" ? <Mic className="size-5" /> : <Music className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold text-vio-900">{draft.file.name}</p>
            <p className="text-sm text-ink-muted">
              {formatDuration(draft.duration)} · {formatBytes(draft.file.size)} · {draft.source === "recording" ? "registrato ora" : "dal dispositivo"}
            </p>
          </div>
        </div>
        <audio
          src={draft.url}
          controls
          preload="metadata"
          className="w-full"
          aria-label="Ascolta l'audio"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDraft((x) => (x && x.url === draft.url && !x.duration ? { ...x, duration: d } : x));
          }}
          onError={() => setUnplayable(true)}
        />
        {unplayable && <p className="text-sm text-ink-soft">Questo browser non riesce a farlo sentire qui. Puoi salvarlo lo stesso: controllo io che sia un audio valido.</p>}
        {mayNotPlayOnIphone(draft.file.name) && (
          <p className="text-sm text-ink-soft">Questo browser registra in formato WebM: alcuni iPhone potrebbero non riprodurlo. Per andare sul sicuro registra dall&apos;iPhone o carica un file m4a o mp3.</p>
        )}
        {askTitle && <Field label="Titolo">{(id) => <Input id={id} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} disabled={uploading} />}</Field>}

        {uploading ? (
          <div role="status" aria-live="polite">
            <div className="flex items-center justify-between text-sm font-bold text-vio-800">
              <span>{pct >= 100 ? "Quasi fatto…" : `Caricamento… ${pct}%`}</span>
              <button type="button" onClick={() => abort.current?.abort()} className="inline-flex items-center gap-1 text-ink-muted hover:text-vio-800">
                <X className="size-4" /> Annulla
              </button>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-tint-100" role="progressbar" aria-label="Caricamento dell'audio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className="h-full rounded-full bg-wine-500 transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : upload?.duplicate ? (
          <div className="space-y-2 rounded-2xl bg-peach-100 p-3" role="alert">
            <p className="text-sm text-vio-900">
              Sembra lo stesso audio di <b>«{upload.duplicate.title || "senza titolo"}»</b>, caricato il {formatDate(upload.duplicate.createdAt.slice(0, 10))}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onSaved({ id: upload.duplicate!.id, title: upload.duplicate!.title })}>
                Usa quello
              </Button>
              <Button size="sm" variant="soft" onClick={() => save(true)}>
                Carica comunque
              </Button>
            </div>
          </div>
        ) : (
          <>
            {upload?.error && (
              <p className="rounded-2xl bg-blush-100 px-3 py-2 text-sm font-bold text-rouge-600" role="alert">
                {upload.error}
              </p>
            )}
            <Button className="w-full" size="lg" onClick={() => save()}>
              {upload?.error ? "Riprova" : "Salva audio"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="soft"
                className="flex-1"
                onClick={() => {
                  if (draft.source === "recording") {
                    discard();
                    void recorder.start();
                  } else input.current?.click();
                }}
              >
                <RotateCcw className="size-4" /> {draft.source === "recording" ? "Registra di nuovo" : "Sostituisci"}
              </Button>
              <Button variant="ghost" className="flex-1" onClick={discard}>
                <Trash2 className="size-4" /> Elimina
              </Button>
            </div>
          </>
        )}
        <input ref={input} type="file" accept={AUDIO_ACCEPT} className="hidden" aria-hidden tabIndex={-1} onChange={(e) => (pickFile(e.target.files?.[0]), (e.target.value = ""))} />
      </section>
    );
  }

  // --- choose ------------------------------------------------------------------
  return (
    <section
      aria-label={heading}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        pickFile(e.dataTransfer.files?.[0]);
      }}
      className={cn("rounded-3xl border-2 border-dashed p-4 transition-colors", drag ? "border-wine-500 bg-blush-100" : "border-tint-200 bg-surface/60")}
    >
      <p className="flex items-center gap-2 font-extrabold text-vio-900">
        <Mic className="size-5 text-vio-500" /> {heading}
      </p>
      <div className={cn("mt-3 grid gap-2", canRecord && "grid-cols-2")}>
        {canRecord && (
          <button type="button" onClick={() => void recorder.start()} className="press flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-b from-wine-500 to-wine-700 px-3 py-3 font-extrabold text-white shadow-soft">
            <Mic className="size-6" /> Registra ora
          </button>
        )}
        <button type="button" onClick={() => input.current?.click()} className="press flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-blush-200 bg-surface px-3 py-3 font-extrabold text-vio-800">
          <FolderOpen className="size-6 text-vio-500" /> Scegli un file
        </button>
      </div>
      <p className="mt-2 hidden text-center text-sm font-bold text-vio-700 pointer-fine:block">oppure trascina qui un audio</p>
      <p className="mt-2 text-center text-xs text-ink-muted">{AUDIO_FORMATS_LABEL}</p>
      {ios && (
        <p className="mt-3 rounded-2xl bg-peach-100 px-3 py-2 text-sm text-vio-900">
          💡 Hai un audio in <b>Memo Vocali</b>? Aprilo, tocca <b>···</b> → <b>Condividi</b> → <b>Salva su File</b>. Poi torna qui e tocca «Scegli un file».
        </p>
      )}
      {(problem || recorder.error) && (
        <p className="mt-3 rounded-2xl bg-blush-100 px-3 py-2 text-sm font-bold text-rouge-600" role="alert">
          {problem ?? recorder.error}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept={AUDIO_ACCEPT}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        data-testid="audio-file-input"
        onChange={(e) => {
          recorder.clearError();
          pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </section>
  );
}
