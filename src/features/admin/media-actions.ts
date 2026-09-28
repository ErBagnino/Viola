"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/server/auth";
import { safeAction } from "@/server/action-result";
import { signMedia } from "@/server/media";

export type PickerMedia = { id: string; kind: "image" | "audio"; url: string; thumbUrl: string; title: string | null; category: string | null; createdAt: string; duration: number | null };

/** Media library for pickers (signed, short-lived URLs). */
export async function listMediaForPicker(kind: "image" | "audio") {
  return safeAction(async () => {
    await assertAdmin();
    z.enum(["image", "audio"]).parse(kind);
    const supabase = await createClient();
    const { data } = await supabase.from("media").select("*").eq("kind", kind).order("created_at", { ascending: false }).limit(400);
    const signed = await signMedia(supabase, data ?? []);
    const rows = new Map((data ?? []).map((m) => [m.id, m]));
    const items: PickerMedia[] = signed.map((m) => ({
      id: m.id,
      kind: m.kind,
      url: m.url,
      thumbUrl: m.thumbUrl,
      title: m.title,
      category: m.category,
      createdAt: rows.get(m.id)?.created_at ?? "",
      duration: rows.get(m.id)?.duration_seconds ?? null,
    }));
    return { items };
  });
}

/** Signed preview for a single media id (form previews). */
export async function mediaPreview(id: string) {
  return safeAction(async () => {
    await assertAdmin();
    if (!z.uuid().safeParse(id).success) return { item: null };
    const supabase = await createClient();
    const { data } = await supabase.from("media").select("*").eq("id", id).maybeSingle();
    const [m] = await signMedia(supabase, [data]);
    return { item: m ? { id: m.id, kind: m.kind, url: m.url, thumbUrl: m.thumbUrl, title: m.title, shared: data?.visibility === "shared" } : null };
  });
}
