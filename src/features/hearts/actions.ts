"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertMember } from "@/server/auth";
import { safeAction, UserError } from "@/server/action-result";
import { getSettings } from "@/server/settings";
import { notifyAdmin, notifyUser } from "@/server/notifications";

const QUIET_MINUTES = 10;

/**
 * "Cuore a distanza": one tap, one heart. The other person sees it in the app;
 * a gentle notification goes out at most once every 10 minutes (no spam).
 */
export async function sendHeart() {
  return safeAction(async () => {
    const viewer = await assertMember();
    const supabase = await createClient();
    const since = new Date(Date.now() - QUIET_MINUTES * 60_000).toISOString();
    const { count: recent } = await supabase.from("hearts").select("id", { count: "exact", head: true }).eq("from_user", viewer.id).gte("created_at", since);
    if ((recent ?? 0) >= 30) throw new UserError("Quanti cuori! ♡ Fai una pausa di qualche minuto.");
    const { error } = await supabase.from("hearts").insert({});
    if (error) throw error;

    let notified = false;
    if ((recent ?? 0) === 0) {
      const settings = await getSettings();
      const { adamName, violaName } = settings.general;
      if (viewer.role === "user" && settings.notifications.notifyOnHeart) {
        const out = await notifyAdmin({ kind: "heart", title: `♡ ${violaName} ti ha lasciato un cuore`, body: "Ti sta pensando.", path: "/admin" }, settings);
        notified = out.delivered;
      } else if (viewer.role === "admin") {
        const admin = createAdminClient();
        const { data: users } = admin ? await admin.from("profiles").select("id").eq("role", "user") : { data: [] };
        for (const u of users ?? []) {
          const out = await notifyUser(u.id, { kind: "heart", title: `♡ ${adamName} ti ha mandato un cuore`, body: "Ti sta pensando.", path: "/viola" });
          notified ||= out.delivered;
        }
      }
    }
    revalidatePath("/viola");
    revalidatePath("/admin");
    return { notified };
  });
}

/** Marks the hearts I received as seen (RLS: never my own). */
export async function markHeartsSeen() {
  return safeAction(async () => {
    const viewer = await assertMember();
    const supabase = await createClient();
    const { error } = await supabase.from("hearts").update({ seen_at: new Date().toISOString() }).neq("from_user", viewer.id).is("seen_at", null);
    if (error) throw error;
    return {};
  });
}
