import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin, HttpError } from "@/server/auth";
import { audit } from "@/server/audit";
import { detectAudioType, MAX_AUDIO_BYTES } from "@/utils/file-signature";
import { audioExtension, STORAGE_AUDIO_MIME } from "@/utils/audio-formats";

export const runtime = "nodejs";
export const maxDuration = 60;

const signSchema = z.object({
  step: z.literal("sign"),
  filename: z.string().min(1).max(200),
  size: z.number().int().positive().max(MAX_AUDIO_BYTES),
  /** false = first ask whether the same file is already in the library */
  allowDuplicate: z.boolean().optional().default(false),
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
 * Step 2 is idempotent: a repeated "finalize" (double tap, retry after a
 * lost answer) returns the same audio instead of a copy — and never
 * deletes a file that is already registered.
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
      const ext = audioExtension(parsed.data.filename);
      if (!ext) return NextResponse.json({ error: "Formato audio non supportato (m4a, mp3, wav, ogg, webm)." }, { status: 415 });
      if (!parsed.data.allowDuplicate) {
        // Same size to the byte = almost surely the same file uploaded twice.
        const { data: same } = await supabase.from("media").select("id, title, created_at").eq("kind", "audio").eq("size_bytes", parsed.data.size).limit(1).maybeSingle();
        if (same) return NextResponse.json({ duplicate: { id: same.id, title: same.title, createdAt: same.created_at } });
      }
      const path = `audio/${crypto.randomUUID()}/audio.${ext}`;
      const { data, error } = await storage.createSignedUploadUrl(path);
      if (error) throw error;
      return NextResponse.json({ path, token: data.token, contentType: STORAGE_AUDIO_MIME[ext] });
    }

    const parsed = finalizeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    const { path } = parsed.data;
    const existing = await supabase.from("media").select("*").eq("path", path).maybeSingle();
    if (existing.data) return NextResponse.json({ media: existing.data });
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
      // A parallel finalize won the race: that row owns the file, keep it.
      if (error.code === "23505") {
        const again = await supabase.from("media").select("*").eq("path", path).maybeSingle();
        if (again.data) return NextResponse.json({ media: again.data });
      }
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
