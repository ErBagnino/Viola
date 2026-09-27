"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertMember } from "@/server/auth";
import { safeAction, UserError } from "@/server/action-result";
import { getSettings } from "@/server/settings";
import { notifyAdmin } from "@/server/notifications";
import { MESSAGE_CATEGORIES } from "@/features/content/constants";


const schema = z.object({
  body: z.string().trim().min(1, "Scrivi qualcosa ♡").max(5000),
  category: z.enum(Object.keys(MESSAGE_CATEGORIES) as [keyof typeof MESSAGE_CATEGORIES]).default("thought"),
  isPrivate: z.boolean().default(false),
});

export async function sendMessage(input: z.input<typeof schema>) {
  return safeAction(async () => {
    const viewer = await assertMember();
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Messaggio non valido");
    const { body, category, isPrivate } = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ body, category, is_private: isPrivate })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("insert failed");

    const settings = await getSettings();
    let delivered = false;
    if (viewer.role === "user" && settings.notifications.notifyOnMessage) {
      const outcome = await notifyAdmin(
        {
          kind: "message",
          title: `♡ ${settings.general.violaName} ti ha scritto`,
          // Private messages never show their content in the notification preview.
          body: isPrivate ? "Un messaggio solo per te. Aprilo nell'app." : body.slice(0, 500),
          path: "/admin/messaggi",
          messageId: data.id,
        },
        settings,
      );
      delivered = outcome.delivered;
    }
    revalidatePath("/viola/scrivi");
    return { delivered };
  });
}

export async function deleteMessage(id: string) {
  return safeAction(async () => {
    await assertMember();
    if (!z.uuid().safeParse(id).success) throw new UserError("Messaggio non valido");
    const supabase = await createClient();
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/viola/scrivi");
    return {};
  });
}
