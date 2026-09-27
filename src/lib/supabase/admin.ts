import "server-only";
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
