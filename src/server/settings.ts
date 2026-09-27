import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseSettings,
  settingsSchemas,
  type SettingsKey,
  type SettingsMap,
} from "@/features/settings/schema";

/** All settings visible to the current user, with defaults filled in. */
export const getSettings = cache(async (): Promise<SettingsMap> => {
  const rows = new Map<string, unknown>();
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("key, value");
    for (const r of data ?? []) rows.set(r.key, r.value);
  } catch {
    // Unconfigured / offline database: defaults only.
  }
  return buildSettings(rows);
});

/** Settings read with the service role (no session), e.g. for the manifest. */
export async function getSystemSettings(): Promise<SettingsMap> {
  const rows = new Map<string, unknown>();
  const admin = createAdminClient();
  if (admin) {
    try {
      const { data } = await admin.from("app_settings").select("key, value");
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
