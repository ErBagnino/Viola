import "server-only";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseSettings,
  settingsSchemas,
  type SettingsKey,
  type SettingsMap,
} from "@/features/settings/schema";

/**
 * All settings with defaults filled in, for SERVER use. Read with the service
 * role when available so that server flows triggered by Viola (AI chat,
 * notifications) use Adam's private settings too. Private groups are never
 * sent to her browser: pages pass only the fields they need, and RLS keeps
 * them unreadable from the client.
 */
export const getSettings = cache(async (): Promise<SettingsMap> => {
  const admin = createAdminClient();
  if (admin) {
    try {
      const { data, error } = await admin.from("app_settings").select("key, value");
      // A working secret key always sees the rows; an empty answer may just
      // be a wrong key (RLS gives 0 rows), so double-check with the session.
      if (!error && data?.length) return buildSettings(new Map(data.map((r) => [r.key, r.value])));
      if (error) console.error("[settings] service-role read failed, using the session instead:", error.code ?? error.message);
    } catch (e) {
      console.error("[settings] service-role read failed, using the session instead:", e instanceof Error ? e.message : e);
    }
  }
  const rows = new Map<string, unknown>();
  try {
    const { data, error } = await (await createClient()).from("app_settings").select("key, value");
    if (error) console.error("[settings] session read failed, using the defaults:", error.code ?? error.message);
    for (const r of data ?? []) rows.set(r.key, r.value);
  } catch (e) {
    unstable_rethrow(e); // let Next handle its own signals (e.g. request-time APIs during prerender)
    // Unconfigured / offline database: defaults only.
    console.error("[settings] database unreachable, using the defaults:", e instanceof Error ? e.message : e);
  }
  return buildSettings(rows);
});

/** Settings read with the service role (no session), e.g. for the manifest. */
export async function getSystemSettings(): Promise<SettingsMap> {
  const rows = new Map<string, unknown>();
  const admin = createAdminClient();
  if (admin) {
    try {
      const { data, error } = await admin.from("app_settings").select("key, value");
      if (error) console.error("[settings] service-role read failed:", error.code ?? error.message);
      for (const r of data ?? []) rows.set(r.key, r.value);
    } catch {
      /* defaults */
    }
  }
  return buildSettings(rows);
}

function buildSettings(rows: Map<string, unknown>): SettingsMap {
  const out = {} as Record<SettingsKey, unknown>;
  for (const key of Object.keys(settingsSchemas) as SettingsKey[]) {
    out[key] = parseSettings(key, rows.get(key));
  }
  return out as SettingsMap;
}
