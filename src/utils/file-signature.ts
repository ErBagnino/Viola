// File-type detection from magic bytes (never trust the client's MIME type).

export type ImageType = "image/jpeg" | "image/png" | "image/webp";
export type AudioType = "audio/mpeg" | "audio/mp4" | "audio/ogg" | "audio/wav" | "audio/webm";

const ascii = (b: Uint8Array, start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len));

export function detectImageType(b: Uint8Array): ImageType | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  return null;
}

export function detectAudioType(b: Uint8Array): AudioType | null {
  if (b.length < 12) return null;
  if (ascii(b, 0, 3) === "ID3") return "audio/mpeg";
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return "audio/mpeg"; // MPEG / ADTS frame sync
  if (ascii(b, 4, 4) === "ftyp") return "audio/mp4";
  if (ascii(b, 0, 4) === "OggS") return "audio/ogg";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WAVE") return "audio/wav";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "audio/webm";
  return null;
}

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
export const AUDIO_EXTENSIONS = ["mp3", "m4a", "mp4", "aac", "ogg", "oga", "wav", "webm"];
export const MAX_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024; // after client-side compression (Vercel limit 4.5MB)
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export function extensionOf(name: string) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}
