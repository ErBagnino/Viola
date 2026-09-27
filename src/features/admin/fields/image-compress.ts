// Client-side photo compression before upload: keeps uploads under the free
// hosting request limit and strips metadata (the server re-encodes again).

const MAX_SIDE = 2400;

export async function compressImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Browser can't decode it (rare): send as-is, the server validates it.
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  for (const q of [0.88, 0.8, 0.7, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size < 3.8 * 1024 * 1024) return blob;
  }
  const last = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.5));
  return last ?? file;
}

/** POST a photo with progress (fetch has no upload progress). */
export function uploadPhoto(blob: Blob, filename: string, meta: Record<string, unknown>, onProgress?: (p: number) => void) {
  return new Promise<{ media?: { id: string }; error?: string }>((resolve) => {
    const fd = new FormData();
    fd.append("file", blob, filename.replace(/\.[^.]+$/, "") + ".jpg");
    fd.append("meta", JSON.stringify(meta));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve({ error: "Risposta non valida dal server." });
      }
    };
    xhr.onerror = () => resolve({ error: "Connessione persa durante il caricamento." });
    xhr.send(fd);
  });
}
