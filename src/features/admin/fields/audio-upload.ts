"use client";

import { publicEnv } from "@/lib/env";

// ---------------------------------------------------------------------------
// Audio upload from the browser: 1) ask the server for a signed upload URL,
// 2) send the file straight to storage (XHR: real progress + cancel),
// 3) let the server check the file and register it. Step 3 is idempotent,
// so "Riprova" after a lost answer never creates a copy.
// ---------------------------------------------------------------------------

export type UploadedAudio = { id: string; title: string | null; duration_seconds: number | null; size_bytes: number };
export type DuplicateAudio = { id: string; title: string | null; createdAt: string };
export type UploadStage = "sign" | "upload" | "finalize";

export type UploadResult =
  | { ok: true; media: UploadedAudio }
  | { ok: false; duplicate: DuplicateAudio }
  | { ok: false; error: string; stage: UploadStage; aborted?: boolean; offline?: boolean };

/** Where a stopped upload can pick up again. */
export type UploadResume = { path: string; token: string; contentType: string; uploaded: boolean };

const OFFLINE = "Sei offline: quando torna la connessione tocca «Riprova». L'audio resta qui.";
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

async function post(body: Record<string, unknown>, signal?: AbortSignal) {
  const res = await fetch("/api/admin/media/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

/** PUT to the signed URL with progress (fetch has no upload progress). */
function putFile(path: string, token: string, blob: Blob, onProgress: (p: number) => void, signal?: AbortSignal) {
  return new Promise<{ ok: true } | { ok: false; error: string; aborted?: boolean }>((resolve) => {
    const url = `${publicEnv.supabaseUrl}/storage/v1/object/upload/sign/media/${path}?token=${encodeURIComponent(token)}`;
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    if (publicEnv.supabaseKey) xhr.setRequestHeader("apikey", publicEnv.supabaseKey);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ ok: true });
      let msg = "";
      try {
        msg = String(JSON.parse(xhr.responseText)?.message ?? "");
      } catch {
        /* not JSON */
      }
      // A retry after a lost answer: the file already arrived.
      if (xhr.status === 409 || /already exists|duplicate/i.test(msg)) return resolve({ ok: true });
      if (/mime|type/i.test(msg)) return resolve({ ok: false, error: "Questo tipo di audio non è accettato. Prova con un file m4a o mp3." });
      if (xhr.status === 413 || /size|large/i.test(msg)) return resolve({ ok: false, error: "L'audio è troppo grande (max 10 MB)." });
      resolve({ ok: false, error: "Il caricamento non è riuscito. Riprova." });
    };
    xhr.onerror = () => resolve({ ok: false, error: isOffline() ? OFFLINE : "Connessione persa durante il caricamento. Riprova." });
    xhr.onabort = () => resolve({ ok: false, error: "Caricamento annullato.", aborted: true });
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", blob);
    xhr.send(body);
  });
}

export async function uploadAudio(opts: {
  file: Blob;
  filename: string;
  title: string;
  duration: number | null;
  allowDuplicate?: boolean;
  resume?: UploadResume | null;
  onProgress: (p: number) => void;
  onResume: (r: UploadResume) => void;
  signal?: AbortSignal;
}): Promise<UploadResult> {
  if (isOffline()) return { ok: false, error: OFFLINE, stage: opts.resume?.uploaded ? "finalize" : "sign", offline: true };
  let resume = opts.resume ?? null;
  try {
    if (!resume) {
      const sign = await post({ step: "sign", filename: opts.filename, size: opts.file.size, allowDuplicate: Boolean(opts.allowDuplicate) }, opts.signal);
      if (sign.json.duplicate) return { ok: false, duplicate: sign.json.duplicate as DuplicateAudio };
      if (sign.status !== 200 || typeof sign.json.path !== "string") return { ok: false, error: String(sign.json.error ?? "Non riesco a preparare il caricamento."), stage: "sign" };
      resume = { path: sign.json.path, token: String(sign.json.token), contentType: String(sign.json.contentType ?? "audio/mp4"), uploaded: false };
      opts.onResume(resume);
    }
    if (!resume.uploaded) {
      // The exact type the storage bucket accepts, whatever the browser called it.
      const typed = new Blob([opts.file], { type: resume.contentType });
      const put = await putFile(resume.path, resume.token, typed, opts.onProgress, opts.signal);
      if (!put.ok) return { ok: false, error: put.error, stage: "upload", aborted: put.aborted };
      resume = { ...resume, uploaded: true };
      opts.onResume(resume);
    }
    opts.onProgress(1);
    const fin = await post({ step: "finalize", path: resume.path, title: opts.title.trim().slice(0, 200) || undefined, duration: opts.duration ?? undefined }, opts.signal);
    if (fin.status !== 200 || !fin.json.media) return { ok: false, error: String(fin.json.error ?? "Non riesco a salvare l'audio."), stage: "finalize" };
    return { ok: true, media: fin.json.media as UploadedAudio };
  } catch (e) {
    if (opts.signal?.aborted) return { ok: false, error: "Caricamento annullato.", stage: resume?.uploaded ? "finalize" : "upload", aborted: true };
    return { ok: false, error: isOffline() ? OFFLINE : e instanceof Error && /fetch|network/i.test(e.message) ? "Connessione persa. Riprova." : "Qualcosa non ha funzionato. Riprova.", stage: resume?.uploaded ? "finalize" : "sign" };
  }
}
