"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extensionForRecording, MAX_RECORDING_SECONDS, pickRecorderType, RECORDING_BITRATE } from "@/utils/audio-formats";

// ---------------------------------------------------------------------------
// Voice recording in the browser (MediaRecorder): Safari on iPhone (iOS 14.3+,
// also inside the installed app), Chrome, Edge, Firefox. Safari records AAC
// in MP4 (.m4a); Chrome and Firefox usually WebM/Opus.
// ---------------------------------------------------------------------------

export type RecorderState = "idle" | "asking" | "recording" | "paused" | "error";
export type Recording = { file: File; duration: number; mime: string };

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Whether this browser can record at all (checked on the client only). */
export function canRecordAudio() {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    window.isSecureContext !== false
  );
}

function micError(e: unknown): string {
  const name = e instanceof DOMException || e instanceof Error ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError")
    return "Il microfono è bloccato. Su iPhone: Impostazioni → App → Safari → Microfono → Consenti (oppure tocca «aA» nella barra dell'indirizzo → Impostazioni sito web → Microfono). Poi riprova.";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "Non trovo un microfono su questo dispositivo.";
  if (name === "NotReadableError" || name === "AbortError") return "Il microfono è occupato (forse da una chiamata o da un'altra app). Chiudila e riprova.";
  return "Non riesco a registrare con questo browser. Puoi registrare con Memo Vocali e poi scegliere il file.";
}

export function useAudioRecorder(onDone: (r: Recording) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const raf = useRef<number | null>(null);
  // time accounting that survives pauses
  const startedAt = useRef(0);
  const accumulated = useRef(0);
  const discard = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const seconds = useCallback(() => accumulated.current + (startedAt.current ? (performance.now() - startedAt.current) / 1000 : 0), []);

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => {
    discard.current = true;
    try {
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    } catch {
      /* already stopped */
    }
    release();
  }, [release]);

  const stop = useCallback(() => {
    const r = recorder.current;
    if (!r || r.state === "inactive") return;
    accumulated.current = seconds();
    startedAt.current = 0;
    r.stop(); // emits the last chunk, then onstop
  }, [seconds]);

  const start = useCallback(async () => {
    if (!canRecordAudio()) {
      setError("Questo browser non può registrare. Puoi registrare con Memo Vocali e poi scegliere il file.");
      setState("error");
      return;
    }
    setError(null);
    setState("asking");
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      setError(micError(e));
      setState("error");
      return;
    }
    stream.current = media;
    const type = pickRecorderType((t) => MediaRecorder.isTypeSupported(t));
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(media, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: RECORDING_BITRATE });
    } catch {
      try {
        rec = new MediaRecorder(media);
      } catch (e) {
        release();
        setError(micError(e));
        setState("error");
        return;
      }
    }
    recorder.current = rec;
    chunks.current = [];
    discard.current = false;
    accumulated.current = 0;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const duration = Math.max(0, accumulated.current);
      release();
      recorder.current = null;
      if (discard.current) {
        chunks.current = [];
        setState("idle");
        return;
      }
      const mime = (rec.mimeType || type || chunks.current[0]?.type || "audio/webm").split(";")[0];
      const blob = new Blob(chunks.current, { type: mime });
      chunks.current = [];
      setState("idle");
      setElapsed(0);
      if (blob.size === 0) {
        setError("La registrazione è vuota. Riprova tenendo il telefono vicino.");
        setState("error");
        return;
      }
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      onDoneRef.current({ file: new File([blob], `vocale-${stamp}.${extensionForRecording(mime)}`, { type: mime }), duration, mime });
    };
    rec.onerror = () => {
      discard.current = true;
      release();
      setError("La registrazione si è interrotta. Riprova.");
      setState("error");
    };
    // timeslice: Safari delivers the data reliably only with periodic chunks
    rec.start(1000);
    startedAt.current = performance.now();
    setElapsed(0);
    setState("recording");
    timer.current = setInterval(() => {
      const s = seconds();
      setElapsed(s);
      if (s >= MAX_RECORDING_SECONDS) stop();
    }, 250);

    // A small level meter, so Adam sees the microphone is really listening.
    try {
      const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        audioCtx.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(media).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          setLevel(Math.min(1, peak / 64));
          raf.current = requestAnimationFrame(tick);
        };
        tick();
      }
    } catch {
      /* the meter is only decoration */
    }
  }, [release, seconds, stop]);

  const pause = useCallback(() => {
    const r = recorder.current;
    if (!r || r.state !== "recording" || typeof r.pause !== "function") return;
    r.pause();
    accumulated.current = seconds();
    startedAt.current = 0;
    setState("paused");
  }, [seconds]);

  const resume = useCallback(() => {
    const r = recorder.current;
    if (!r || r.state !== "paused") return;
    r.resume();
    startedAt.current = performance.now();
    setState("recording");
  }, []);

  /** Stop and throw the recording away. */
  const cancel = useCallback(() => {
    discard.current = true;
    const r = recorder.current;
    if (r && r.state !== "inactive") r.stop();
    else {
      release();
      setState("idle");
    }
    setElapsed(0);
  }, [release]);

  const canPause = typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && typeof MediaRecorder.prototype.pause === "function";

  return { state, error, elapsed, level, start, stop, pause, resume, cancel, canPause, clearError: () => setError(null) };
}
