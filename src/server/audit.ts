import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/db/database.types";

/** Records an admin action (who, what, before/after). Never throws; returns the event id. */
export async function audit(entry: {
  adminId: string;
  action: string;
  table?: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
}): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("admin_audit_logs")
      .insert({
      admin_id: entry.adminId,
      action: entry.action,
      target_table: entry.table ?? null,
      target_id: entry.targetId ?? null,
      before: (entry.before ?? null) as Json,
      after: (entry.after ?? null) as Json,
      })
      .select("id")
      .single();
    if (error) console.error(`[audit] not recorded ${JSON.stringify({ action: entry.action, code: error.code, message: error.message?.slice(0, 200) })}`);
    return data?.id ?? null;
  } catch (e) {
    // auditing must never break the admin, but it must not fail silently either
    console.error(`[audit] not recorded ${JSON.stringify({ action: entry.action, message: e instanceof Error ? e.message.slice(0, 200) : "?" })}`);
    return null;
  }
}
