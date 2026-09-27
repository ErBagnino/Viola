"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertMember } from "@/server/auth";
import { safeAction, UserError, assertNotPreview } from "@/server/action-result";
import { getSettings } from "@/server/settings";
import { notifyAdmin } from "@/server/notifications";

const schema = z.object({
  mood: z.number().int().min(1).max(5).nullable(),
  note: z.string().trim().max(2000).optional().default(""),
  shared: z.boolean().default(true),
});

export async function saveMood(input: z.input<typeof schema>) {
  return safeAction(async () => {
    const viewer = await assertMember();
    assertNotPreview(viewer);
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new UserError("Qualcosa non va nei dati ♡");
    const { mood, note, shared } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from("mood_entries")
      .insert({ user_id: viewer.id, mood, note: note || null, shared });
    if (error) throw error;

    const settings = await getSettings();
    if (shared && viewer.role === "user" && settings.notifications.notifyOnLowMood && mood !== null && mood <= 2) {
      await notifyAdmin(
        {
          kind: "mood",
          title: `♡ ${settings.general.violaName} non sta benissimo`,
          body: `Ha segnato il suo umore${note ? `: "${note.slice(0, 200)}"` : "."} Magari scrivile.`,
          path: "/admin/umore",
        },
        settings,
      );
    }
    revalidatePath("/viola/umore");
    return {};
  });
}

export async function deleteMood(id: string) {
  return safeAction(async () => {
    await assertMember();
    if (!z.uuid().safeParse(id).success) throw new UserError("Voce non valida");
    const supabase = await createClient();
    const { error } = await supabase.from("mood_entries").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/viola/umore");
    return {};
  });
}
