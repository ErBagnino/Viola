"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/server/auth";
import { audit } from "@/server/audit";
import { safeAction, UserError } from "@/server/action-result";
import { isSettingsKey, PUBLIC_SETTINGS, settingsSchemas } from "./schema";
import { SETTINGS_FORMS } from "./fields";
import type { Json } from "@/db/database.types";

export async function saveSettingsAction(key: string, value: Record<string, unknown>) {
  return safeAction(async () => {
    const admin = await assertAdmin();
    if (!isSettingsKey(key)) throw new UserError("Impostazione sconosciuta");
    const parsed = settingsSchemas[key].safeParse(value);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      const name = String(i?.path[0] ?? "");
      const label = SETTINGS_FORMS[key]?.fields.find((f) => f.name === name)?.label ?? name;
      throw new UserError(`«${label}»: ${i?.message ?? "valore non valido"}`);
    }
    const supabase = await createClient();
    const { data: before } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key, value: parsed.data as NonNullable<Json>, is_public: PUBLIC_SETTINGS.includes(key), updated_by: admin.id }, { onConflict: "key" });
    if (error) throw error;
    await audit({ adminId: admin.id, action: key.startsWith("ai") ? "ai_config" : "settings", table: "app_settings", targetId: key, before: before?.value ?? null, after: parsed.data });
    revalidatePath("/", "layout");
    return {};
  });
}
