"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertMember } from "@/server/auth";
import { safeAction, assertNotPreview } from "@/server/action-result";

const schema = z.object({
  moods: z.boolean(),
  journal: z.boolean(),
  messages: z.boolean(),
  activity: z.boolean(),
  aiChats: z.boolean(),
  hearts: z.boolean().default(false),
});

/** Lets Viola erase her own data (RLS restricts each delete to her rows). */
export async function deleteMyData(input: z.input<typeof schema>) {
  return safeAction(async () => {
    const viewer = await assertMember();
    assertNotPreview(viewer);
    const opts = schema.parse(input);
    const supabase = await createClient();
    const jobs: PromiseLike<unknown>[] = [];
    if (opts.moods) jobs.push(supabase.from("mood_entries").delete().eq("user_id", viewer.id));
    if (opts.journal) jobs.push(supabase.from("journal_entries").delete().eq("user_id", viewer.id));
    if (opts.messages) jobs.push(supabase.from("messages").delete().eq("sender_id", viewer.id));
    if (opts.activity) jobs.push(supabase.from("activity_events").delete().eq("user_id", viewer.id));
    if (opts.aiChats) jobs.push(supabase.from("ai_conversations").delete().eq("user_id", viewer.id).eq("scope", "viola"));
    if (opts.hearts) jobs.push(supabase.from("hearts").delete().eq("from_user", viewer.id));
    await Promise.all(jobs);
    return {};
  });
}

/** "Adam può vedere quando uso gli esercizi" — her own switch, nothing else. */
export async function setShareActivity(share: boolean) {
  return safeAction(async () => {
    const viewer = await assertMember();
    assertNotPreview(viewer);
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ share_activity: z.boolean().parse(share) }).eq("id", viewer.id);
    if (error) throw error;
    return { share };
  });
}
