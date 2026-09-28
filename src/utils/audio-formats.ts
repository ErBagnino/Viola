// Audio formats — what can be uploaded or recorded, and how it is stored.
// Shared by the browser (recorder, file picker) and the upload API.
//
// The storage bucket accepts only a fixed list of MIME types, and browsers
// report the same file in many ways (audio/x-m4a, audio/x-wav, audio/mp3,
// "audio/webm;codecs=opus"…). So the type saved in storage always comes
// from the file extension, never from the browser.
import { AUDIO_EXTENSIONS, extensionOf, MAX_AUDIO_BYTES } from "./file-signature";

/** Extension → the MIME type used in storage (all in the bucket's allowed list). */
export const STORAGE_AUDIO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
};

/**
 * For the file picker. "audio/*" lets iPhone open the Files app; the
 * extensions make sure .m4a from Voice Memos are never greyed out.
 */
export const AUDIO_ACCEPT = ["audio/*", ...AUDIO_EXTENSIONS.map((e) => `.${e}`)].join(",");

/** Shown to Adam next to the buttons. */
export const AUDIO_FORMATS_LABEL = "m4a, mp3, wav, ogg, webm · max 10 MB";

/** Recording stops by itself before the file gets too big to upload. */
export const MAX_RECORDING_SECONDS = 12 * 60;
/** ~12 KB/s: 12 minutes stay well under 10 MB. */
export const RECORDING_BITRATE = 96_000;

export function audioExtension(name: string): string | null {
  const ext = extensionOf(name);
  return AUDIO_EXTENSIONS.includes(ext) ? ext : null;
}

export function storageMimeFor(name: string): string | null {
  const ext = audioExtension(name);
  return ext ? STORAGE_AUDIO_MIME[ext] : null;
}

/**
 * Recording formats, best first. AAC in MP4 plays everywhere (iPhone
 * included); WebM/Opus is what Chrome and Firefox usually record; a plain
 * "audio/mp4" may hold Opus. Safari (iPhone) always takes the first one.
 */
export const RECORDER_TYPES = ["audio/mp4;codecs=mp4a.40.2", "audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

export function pickRecorderType(isSupported: (type: string) => boolean): string | null {
  for (const t of RECORDER_TYPES) {
    try {
      if (isSupported(t)) return t;
    } catch {
      /* some browsers throw for unknown types */
    }
  }
  return null;
}

/** "audio/webm;codecs=opus" → "webm" (the extension of the recorded file). */
export function extensionForRecording(mime: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base === "audio/mp4" || base === "video/mp4" || base === "audio/x-m4a") return "m4a";
  if (base === "audio/webm" || base === "video/webm") return "webm";
  if (base === "audio/ogg") return "ogg";
  if (base === "audio/aac") return "aac";
  if (base === "audio/mpeg") return "mp3";
  if (base === "audio/wav" || base === "audio/x-wav") return "wav";
  return "webm";
}

/** WebM/Opus may not play on some iPhones: worth a gentle note. */
export const mayNotPlayOnIphone = (name: string) => audioExtension(name) === "webm";

/** 0:17 · 1:05 · 12:00 */
export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 850 KB · 2,4 MB */
export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Why a file cannot be used, in words Adam understands (null = fine). */
export function audioFileProblem(file: { name: string; size: number }): string | null {
  if (!audioExtension(file.name)) {
    const ext = extensionOf(file.name);
    return `${ext ? `I file .${ext}` : "Questo file"} non ${ext ? "sono audio che posso usare" : "è un audio che posso usare"}. Scegli un audio m4a, mp3, wav, ogg o webm.`;
  }
  if (file.size === 0) return "Il file è vuoto.";
  if (file.size > MAX_AUDIO_BYTES)
    return `L'audio pesa ${formatBytes(file.size)}: il massimo è 10 MB (circa 20 minuti di Memo Vocali). Puoi accorciarlo in Memo Vocali (··· → Modifica registrazione → ritaglia) e riprovare.`;
  return null;
}

/** "Vocale del 28 settembre" — the default title of a recording. */
export function recordingTitle(now = new Date(), timeZone = "Europe/Rome") {
  return `Vocale del ${new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone }).format(now)}`;
}

/** "Buonanotte amore.m4a" → "Buonanotte amore"; "Nuova registrazione 12.m4a" stays readable. */
export function titleFromFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
