"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertMember } from "@/server/auth";
import { safeAction, UserError, assertNotPreview } from "@/server/action-result";
import { getSettings } from "@/server/settings";
import { notifyAdmin } from "@/server/notifications";

const schema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().max(200).optional().default(""),
  body: z.string().trim().min(1, "Scrivi qualcosa ♡").max(20000),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  visibility: z.enum(["private", "shared"]).default("private"),
});

export async function saveJournal(input: z.input<typeof schema>) {
  return safeAction(async () => {
    const viewer = await assertMember();
    assertNotPreview(viewer);
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Dati non validi");
    const { id, title, body, mood, visibility } = parsed.data;
    const supabase = await createClient();
    let wasShared = false;
    if (id) {
      const { data: prev } = await supabase.from("journal_entries").select("visibility").eq("id", id).maybeSingle();
      if (!prev) throw new UserError("Pagina non trovata");
      wasShared = prev.visibility === "shared";
      const { error } = await supabase.from("journal_entries").update({ title: title || null, body, mood: mood ?? null, visibility }).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("journal_entries").insert({ title: title || null, body, mood: mood ?? null, visibility });
      if (error) throw error;
    }
    const settings = await getSettings();
    if (visibility === "shared" && !wasShared && viewer.role === "user" && settings.notifications.notifyOnSharedJournal) {
      await notifyAdmin(
        {
          kind: "journal",
          title: `♡ ${settings.general.violaName} ha condiviso una pagina di diario`,
          body: title ? `"${title.slice(0, 120)}"` : "Aprila nell'app.",
          path: "/admin/messaggi",
        },
        settings,
      );
    }
    revalidatePath("/viola/diario");
    return {};
  });
}

export async function deleteJournal(id: string) {
  return safeAction(async () => {
    await assertMember();
    if (!z.uuid().safeParse(id).success) throw new UserError("Pagina non valida");
    const supabase = await createClient();
    const { error } = await supabase.from("journal_entries").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/viola/diario");
    return {};
  });
}
