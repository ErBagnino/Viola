import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/db/database.types";

/** Records an admin action (who, what, before/after). Never throws. */
export async function audit(entry: {
  adminId: string;
  action: string;
  table?: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("admin_audit_logs").insert({
      admin_id: entry.adminId,
      action: entry.action,
      target_table: entry.table ?? null,
      target_id: entry.targetId ?? null,
      before: (entry.before ?? null) as Json,
      after: (entry.after ?? null) as Json,
    });
  } catch {
    /* auditing must never break the admin */
  }
}
