import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin, HttpError } from "@/server/auth";
import { audit } from "@/server/audit";
import { AUDIO_EXTENSIONS, detectAudioType, extensionOf, MAX_AUDIO_BYTES } from "@/utils/file-signature";

export const runtime = "nodejs";
export const maxDuration = 60;

const signSchema = z.object({
  step: z.literal("sign"),
  filename: z.string().min(1).max(200),
  size: z.number().int().positive().max(MAX_AUDIO_BYTES),
});
const finalizeSchema = z.object({
  step: z.literal("finalize"),
  path: z.string().regex(/^audio\/[0-9a-f-]{36}\/[a-z0-9.]{3,12}$/),
  title: z.string().trim().max(200).optional(),
  duration: z.number().min(0).max(36000).optional(),
});

/**
 * Audio upload in two steps so big files never pass through the server
 * function (Vercel limit): 1) signed upload URL, 2) validate + register.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await assertAdmin();
    const body = await request.json();
    const supabase = await createClient();
    const storage = supabase.storage.from("media");

    if (body?.step === "sign") {
      const parsed = signSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "File audio non valido o troppo grande (max 10 MB)." }, { status: 400 });
      const ext = extensionOf(parsed.data.filename);
      if (!AUDIO_EXTENSIONS.includes(ext)) return NextResponse.json({ error: "Formato audio non supportato (mp3, m4a, ogg, wav, webm)." }, { status: 415 });
      const path = `audio/${crypto.randomUUID()}/audio.${ext}`;
      const { data, error } = await storage.createSignedUploadUrl(path);
      if (error) throw error;
      return NextResponse.json({ path, token: data.token });
    }

    const parsed = finalizeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    const { path } = parsed.data;
    const { data: blob, error: dlErr } = await storage.download(path);
    if (dlErr || !blob) return NextResponse.json({ error: "File non trovato." }, { status: 404 });
    if (blob.size > MAX_AUDIO_BYTES) {
      await storage.remove([path]);
      return NextResponse.json({ error: "Audio troppo grande (max 10 MB)." }, { status: 413 });
    }
    const head = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
    const type = detectAudioType(head);
    if (!type) {
      await storage.remove([path]);
      return NextResponse.json({ error: "Il file non è un audio valido." }, { status: 415 });
    }
    const { data, error } = await supabase
      .from("media")
      .insert({
        kind: "audio",
        path,
        mime: type,
        size_bytes: blob.size,
        title: parsed.data.title || null,
        duration_seconds: parsed.data.duration ?? null,
        contexts: [],
        include_in_random: false,
        created_by: admin.id,
      })
      .select("*")
      .single();
    if (error) {
      await storage.remove([path]);
      throw error;
    }
    await audit({ adminId: admin.id, action: "upload", table: "media", targetId: data.id, after: { title: data.title, size: data.size_bytes } });
    return NextResponse.json({ media: data });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[audio-upload]", e);
    return NextResponse.json({ error: "Ops, qualcosa si è inceppato. Riproviamo. ♡" }, { status: 500 });
  }
}
