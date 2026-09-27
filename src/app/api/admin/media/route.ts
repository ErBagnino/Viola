import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin, HttpError } from "@/server/auth";
import { processImage } from "@/server/media-upload";
import { audit } from "@/server/audit";
import { RESOURCES } from "@/features/admin/resources";
import { deriveMediaFlags } from "@/server/admin/crud";
import { detectImageType, extensionOf, IMAGE_EXTENSIONS, MAX_IMAGE_UPLOAD_BYTES } from "@/utils/file-signature";

export const runtime = "nodejs";
export const maxDuration = 60;

const FRIENDLY = "Ops, qualcosa si è inceppato. Riproviamo. ♡";

/** Upload one photo (multipart: file + meta JSON). Admin only. */
export async function POST(request: NextRequest) {
  let uploaded: string[] = [];
  try {
    const admin = await assertAdmin();
    const len = Number(request.headers.get("content-length") ?? 0);
    if (len > MAX_IMAGE_UPLOAD_BYTES + 256 * 1024) return NextResponse.json({ error: "La foto è troppo grande (max 4 MB dopo la compressione)." }, { status: 413 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) return NextResponse.json({ error: "La foto è troppo grande (max 4 MB)." }, { status: 413 });
    const ext = extensionOf(file.name);
    if (ext && !IMAGE_EXTENSIONS.includes(ext)) return NextResponse.json({ error: "Formato non supportato: usa JPEG, PNG o WEBP." }, { status: 415 });

    const buf = Buffer.from(await file.arrayBuffer());
    const type = detectImageType(buf);
    if (!type) return NextResponse.json({ error: "Il file non è una foto JPEG, PNG o WEBP valida." }, { status: 415 });

    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(String(form.get("meta") ?? "{}"));
    } catch {
      /* use defaults */
    }
    const parsedMeta = RESOURCES.media.schema.safeParse(meta);
    if (!parsedMeta.success) return NextResponse.json({ error: "Dati della foto non validi." }, { status: 400 });

    deriveMediaFlags(RESOURCES.media, parsedMeta.data as Record<string, unknown>);
    const { full, thumb, width, height } = await processImage(buf).catch(() => {
      throw new HttpError(415, "Non riesco a leggere questa foto. Prova con un altro file.");
    });

    const id = crypto.randomUUID();
    const path = `images/${id}/full.webp`;
    const thumbPath = `images/${id}/thumb.webp`;
    const supabase = await createClient();
    const storage = supabase.storage.from("media");
    const up1 = await storage.upload(path, full, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
    if (up1.error) throw up1.error;
    uploaded.push(path);
    const up2 = await storage.upload(thumbPath, thumb, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
    if (up2.error) throw up2.error;
    uploaded.push(thumbPath);

    const { data, error } = await supabase
      .from("media")
      .insert({
        ...(parsedMeta.data as Record<string, unknown>),
        id,
        kind: "image",
        path,
        thumb_path: thumbPath,
        mime: "image/webp",
        size_bytes: full.length + thumb.length,
        width,
        height,
        created_by: admin.id,
      })
      .select("*")
      .single();
    if (error) throw error;
    uploaded = [];
    await audit({ adminId: admin.id, action: "upload", table: "media", targetId: id, after: { title: data.title, size: data.size_bytes } });
    return NextResponse.json({ media: data });
  } catch (e) {
    if (uploaded.length) {
      const supabase = await createClient();
      await supabase.storage.from("media").remove(uploaded).catch(() => undefined);
    }
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[upload]", e);
    return NextResponse.json({ error: FRIENDLY }, { status: 500 });
  }
}
