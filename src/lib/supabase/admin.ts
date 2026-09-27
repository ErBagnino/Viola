import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/server/env";

/**
 * Service-role client. Bypasses RLS — use ONLY on the server for the few
 * system tasks that need it (notifications, AI context, manifest, cron).
 * Returns null when the key is not configured.
 */
export function createAdminClient() {
  const key = serverEnv.serviceRoleKey;
  if (!publicEnv.supabaseUrl || !key) return null;
  return createClient<Database>(publicEnv.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type ServiceRoleStatus = "ok" | "missing" | "invalid";

/**
 * Does SUPABASE_SERVICE_ROLE_KEY really work? A key that is set but wrong
 * (the publishable key pasted by mistake, or a key of another project) makes
 * every service read fail quietly — e.g. saved settings seem to vanish.
 * One tiny query, once per request.
 */
export const serviceRoleStatus = cache(async (): Promise<ServiceRoleStatus> => {
  const admin = createAdminClient();
  if (!admin) return "missing";
  try {
    // RLS hides every profile from the publishable/anon key (0 rows, no
    // error); only a real secret key of THIS project sees them, and there is
    // always at least one (Adam's) when someone is signed in.
    const { error, count } = await admin.from("profiles").select("id", { count: "exact", head: true });
    if (error || !count) {
      console.error("[supabase] SUPABASE_SERVICE_ROLE_KEY does not work:", error?.code ?? error?.message ?? "no count");
      return "invalid";
    }
    return "ok";
  } catch (e) {
    console.error("[supabase] SUPABASE_SERVICE_ROLE_KEY check failed:", e instanceof Error ? e.message : e);
    return "invalid";
  }
});
