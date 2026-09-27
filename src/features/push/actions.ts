"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertMember } from "@/server/auth";
import { safeAction, UserError } from "@/server/action-result";

const subSchema = z.object({
  endpoint: z.url().max(1000).refine((u) => u.startsWith("https://"), "endpoint non sicuro"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
  userAgent: z.string().max(300).optional(),
});

export async function savePushSubscription(input: z.input<typeof subSchema>) {
  return safeAction(async () => {
    const viewer = await assertMember();
    const parsed = subSchema.safeParse(input);
    if (!parsed.success) throw new UserError("Iscrizione alle notifiche non valida.");
    const supabase = await createClient();
    // The same browser endpoint may already exist: a re-subscribe, or the same
    // phone previously used with the other account. The device now belongs to
    // whoever just subscribed from it, so the old row is replaced (service
    // role: RLS would hide the other account's row and the insert would fail).
    const admin = createAdminClient();
    await (admin ?? supabase).from("notification_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
    const { error } = await supabase.from("notification_subscriptions").insert({
      user_id: viewer.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: parsed.data.userAgent ?? null,
    });
    if (error) throw error;
    return {};
  });
}

export async function removePushSubscription(endpoint: string) {
  return safeAction(async () => {
    await assertMember();
    const supabase = await createClient();
    await supabase.from("notification_subscriptions").delete().eq("endpoint", endpoint);
    return {};
  });
}
