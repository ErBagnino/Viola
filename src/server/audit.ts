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
    const { data } = await supabase
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
    return data?.id ?? null;
  } catch {
    /* auditing must never break the admin */
    return null;
  }
}
