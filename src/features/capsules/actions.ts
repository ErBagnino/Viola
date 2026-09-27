"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertMember } from "@/server/auth";
import { safeAction, UserError } from "@/server/action-result";
import { mediaFor } from "@/server/viola-data";

/** Returns an unlocked capsule's content. RLS hides locked ones entirely. */
export async function openCapsule(id: string) {
  return safeAction(async () => {
    const viewer = await assertMember();
    if (!z.uuid().safeParse(id).success) throw new UserError("Lettera non valida");
    const supabase = await createClient();
    const { data } = await supabase.from("time_capsules").select("id, title, body, media_id, unlock_at").eq("id", id).maybeSingle();
    if (!data || new Date(data.unlock_at).getTime() > Date.now()) throw new UserError("Questa lettera non è ancora pronta.");
    if (viewer.role === "user") await supabase.rpc("mark_capsule_opened", { capsule_id: id });
    const media = await mediaFor(supabase, data.media_id);
    return { title: data.title, body: data.body, imageUrl: media?.url ?? null };
  });
}
