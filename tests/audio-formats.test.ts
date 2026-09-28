import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIO_ACCEPT,
  audioFileProblem,
  extensionForRecording,
  formatBytes,
  formatDuration,
  mayNotPlayOnIphone,
  pickRecorderType,
  recordingTitle,
  STORAGE_AUDIO_MIME,
  storageMimeFor,
  titleFromFileName,
} from "@/utils/audio-formats";
import { AUDIO_EXTENSIONS, MAX_AUDIO_BYTES } from "@/utils/file-signature";

describe("audio formats", () => {
  it("every accepted extension is stored with a type the storage bucket allows", () => {
    const sql = readFileSync(path.resolve(import.meta.dirname, "../supabase/migrations/20260927000003_storage.sql"), "utf8");
    const allowed = [...sql.matchAll(/'(audio\/[a-z0-9-]+)'/g)].map((m) => m[1]);
    for (const ext of AUDIO_EXTENSIONS) {
      expect(STORAGE_AUDIO_MIME[ext], ext).toBeTruthy();
      expect(allowed, ext).toContain(STORAGE_AUDIO_MIME[ext]);
    }
  });

  it("uses the extension, never what the browser says (audio/x-m4a, audio/x-wav, codecs=…)", () => {
    expect(storageMimeFor("Nuova registrazione 12.m4a")).toBe("audio/mp4");
    expect(storageMimeFor("MEMO.M4A")).toBe("audio/mp4");
    expect(storageMimeFor("canzone.mp3")).toBe("audio/mpeg");
    expect(storageMimeFor("vocale.webm")).toBe("audio/webm");
    expect(storageMimeFor("nota.opus")).toBe("audio/ogg");
    expect(storageMimeFor("foto.jpg")).toBeNull();
  });

  it("the iPhone file picker opens Files and never greys out Voice Memos", () => {
    expect(AUDIO_ACCEPT.split(",")).toEqual(expect.arrayContaining(["audio/*", ".m4a", ".mp3", ".wav"]));
  });

  it("chooses the recording format that plays everywhere when the browser has it", () => {
    const safari = new Set(["audio/mp4;codecs=mp4a.40.2", "audio/mp4"]);
    expect(pickRecorderType((t) => safari.has(t))).toBe("audio/mp4;codecs=mp4a.40.2");
    const chromium = new Set(["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]);
    expect(pickRecorderType((t) => chromium.has(t))).toBe("audio/webm;codecs=opus");
    const firefox = new Set(["audio/ogg;codecs=opus"]);
    expect(pickRecorderType((t) => firefox.has(t))).toBe("audio/ogg;codecs=opus");
    expect(pickRecorderType(() => false)).toBeNull();
    expect(
      pickRecorderType(() => {
        throw new Error("unknown");
      }),
    ).toBeNull();
  });

  it("names the recorded file after its real format", () => {
    expect(extensionForRecording("audio/mp4;codecs=mp4a.40.2")).toBe("m4a");
    expect(extensionForRecording("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionForRecording("audio/ogg;codecs=opus")).toBe("ogg");
    expect(extensionForRecording("video/mp4")).toBe("m4a");
    expect(mayNotPlayOnIphone("vocale.webm")).toBe(true);
    expect(mayNotPlayOnIphone("vocale.m4a")).toBe(false);
  });

  it("explains in plain words why a file cannot be used", () => {
    expect(audioFileProblem({ name: "documento.pdf", size: 1000 })).toMatch(/\.pdf non sono audio/);
    expect(audioFileProblem({ name: "senza-estensione", size: 1000 })).toMatch(/non è un audio/);
    expect(audioFileProblem({ name: "vuoto.m4a", size: 0 })).toMatch(/vuoto/);
    expect(audioFileProblem({ name: "lungo.m4a", size: MAX_AUDIO_BYTES + 1 })).toMatch(/massimo è 10 MB.*Memo Vocali/);
    expect(audioFileProblem({ name: "Buonanotte.M4A", size: 2_000_000 })).toBeNull();
  });

  it("shows sizes, durations and default titles like a person would", () => {
    expect(formatDuration(17)).toBe("0:17");
    expect(formatDuration(65.4)).toBe("1:05");
    expect(formatDuration(Infinity)).toBe("—");
    expect(formatDuration(null)).toBe("—");
    expect(formatBytes(850 * 1024)).toBe("850 KB");
    expect(formatBytes(2.4 * 1024 * 1024)).toBe("2,4 MB");
    expect(recordingTitle(new Date("2026-09-28T10:00:00Z"))).toBe("Vocale del 28 settembre");
    expect(titleFromFileName("Buonanotte_amore.m4a")).toBe("Buonanotte amore");
  });
});
