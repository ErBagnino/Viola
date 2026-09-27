"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertMember } from "@/server/auth";
import { safeAction } from "@/server/action-result";
import { getSettings } from "@/server/settings";
import { notifyAdmin } from "@/server/notifications";
import { getContact } from "@/server/contact";
import { formatTime } from "@/utils/dates";

const schema = z.object({ message: z.string().trim().max(2000).optional().default("") });

/**
 * "HO BISOGNO DI ADAM": stores the request, tries every free channel and
 * ALWAYS returns a direct way to reach Adam (WhatsApp / phone).
 */
export async function requestAdam(input: { message?: string }) {
  return safeAction(async () => {
    const viewer = await assertMember();
    const settings = await getSettings();
    const contact = getContact(settings);
    const { message } = schema.parse(input ?? {});
    const supabase = await createClient();

    // Anti-spam: at most 4 automatic alerts every 10 minutes.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("adam_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", viewer.id)
      .gte("created_at", since);

    const { data: request, error } = await supabase
      .from("adam_requests")
      .insert({ message: message || null })
      .select("id, created_at")
      .single();
    if (error || !request) throw error ?? new Error("insert failed");

    let delivered = false;
    let channels: string[] = [];
    let throttled = false;
    if ((count ?? 0) >= 4) {
      throttled = true;
    } else {
      const name = settings.general.violaName;
      const outcome = await notifyAdmin(
        {
          kind: "need_adam",
          title: `♡ ${name.toUpperCase()} HA BISOGNO DI TE`,
          body: `Ora: ${formatTime(request.created_at, settings.general.timezone)}\nMessaggio: "${message || "Ho bisogno di te."}"`,
          path: "/admin/richieste",
          urgent: true,
          requestId: request.id,
        },
        settings,
      );
      delivered = outcome.delivered;
      channels = outcome.results.filter((r) => r.status === "sent").map((r) => r.channel);
      const admin = createAdminClient();
      if (admin) {
        await admin
          .from("adam_requests")
          .update({ notified_channels: channels, notification_ok: delivered })
          .eq("id", request.id);
      }
    }

    revalidatePath("/viola/adam");
    return {
      requestId: request.id,
      delivered,
      throttled,
      channels,
      whatsappUrl: contact.whatsappUrl,
      phoneUrl: contact.phoneUrl,
    };
  });
}
