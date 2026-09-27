import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { RESOURCES, type ResourceDef } from "@/features/admin/resources";
import { settingsSchemas, isSettingsKey, PUBLIC_SETTINGS } from "@/features/settings/schema";
import { assertAdmin } from "@/server/auth";
import { audit } from "@/server/audit";
import { UserError } from "@/server/action-result";
import type { Json } from "@/db/database.types";

// Content that can be exported / imported. Never exports secrets (they live
// only in environment variables) nor Viola's private data.
export const BACKUP_KEYS = ["dedications", "memories", "comfort_actions", "countdowns", "open_when_cards", "time_capsules", "daily_surprises", "phrases", "breathing_presets", "grounding_exercises", "home_modules", "quiz_questions", "ai_memory"] as const;

export async function exportBackup(keys: string[] = [...BACKUP_KEYS], includeSettings = true) {
  const admin = await assertAdmin();
  const supabase = await createClient();
  const out: Record<string, unknown> = { format: "vio-backup", version: 1, exportedAt: new Date().toISOString() };
  const data: Record<string, unknown[]> = {};
  for (const key of keys) {
    const def = RESOURCES[key as keyof typeof RESOURCES] as ResourceDef | undefined;
    if (!def || !def.exportable) continue;
    const cols = ["id", ...Object.keys(def.schema.shape)];
    const { data: rows } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown[] | null }> } }).from(def.table).select(cols.join(","));
    data[key] = rows ?? [];
  }
  out.data = data;
  if (includeSettings) {
    const { data: settings } = await supabase.from("app_settings").select("key, value");
    out.settings = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  }
  await audit({ adminId: admin.id, action: "export", after: { keys } });
  return out;
}

const fileSchema = z.object({
  format: z.literal("vio-backup"),
  version: z.number(),
  data: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).default({}),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/** Imports a backup: upsert by id, every row validated with the registry schema. */
export async function importBackup(json: unknown, opts: { includeSettings: boolean }) {
  const admin = await assertAdmin();
  const parsed = fileSchema.safeParse(json);
  if (!parsed.success) throw new UserError("File non valido: non è un backup di questa app.");
  const supabase = await createClient();
  const client = supabase as unknown as { from: (t: string) => { upsert: (v: unknown, o: unknown) => Promise<{ error: unknown }> } };
  const report: Record<string, { ok: number; skipped: number }> = {};

  for (const [key, rows] of Object.entries(parsed.data.data)) {
    const def = RESOURCES[key as keyof typeof RESOURCES] as ResourceDef | undefined;
    if (!def || !def.exportable) continue;
    report[key] = { ok: 0, skipped: 0 };
    const valid: Record<string, unknown>[] = [];
    for (const row of rows.slice(0, 2000)) {
      const clean = def.schema.safeParse(row);
      const id = z.uuid().safeParse(row.id);
      if (!clean.success || (def.check && def.check(clean.data))) {
        report[key].skipped++;
        continue;
      }
      // media references may not exist in this project: drop them
      const value = { ...clean.data } as Record<string, unknown>;
      for (const k of ["media_id", "audio_id", "sound_id"]) if (k in value) value[k] = null;
      valid.push(id.success ? { id: id.data, ...value } : value);
    }
    if (valid.length) {
      const { error } = await client.from(def.table).upsert(valid, { onConflict: "id" });
      if (error) throw new UserError(`Errore importando ${def.label}.`);
    }
    report[key].ok = valid.length;
  }

  if (opts.includeSettings && parsed.data.settings) {
    for (const [key, value] of Object.entries(parsed.data.settings)) {
      if (!isSettingsKey(key)) continue;
      const v = settingsSchemas[key].safeParse(value);
      if (!v.success) continue;
      await supabase.from("app_settings").upsert({ key, value: v.data as NonNullable<Json>, is_public: PUBLIC_SETTINGS.includes(key), updated_by: admin.id }, { onConflict: "key" });
    }
  }
  await audit({ adminId: admin.id, action: "import", after: report });
  return report;
}
