"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/server/auth";
import { safeAction, UserError } from "@/server/action-result";
import { audit } from "@/server/audit";
import type { Json } from "@/db/database.types";
import { batchIdsSchema, batchPatchSchema, snapshotKeys, type BatchPatch } from "./media-batch";

const UNDO_MINUTES = 30;
const CHUNK = 100;

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Richiesta non valida";

function chunks<T>(list: T[], size = CHUNK) {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * Applies the same change to many photos in ONE database statement
 * (admin_batch_update_media): only the fields in `patch` change. Returns
 * how many were updated, which ids were not (deleted meanwhile, not found)
 * and a token to undo it.
 */
export async function batchUpdateMedia(ids: string[], patch: BatchPatch) {
  return safeAction(async () => {
    const admin = await assertAdmin();
    const idList = batchIdsSchema.safeParse(ids);
    if (!idList.success) throw new UserError(firstIssue(idList.error));
    const parsed = batchPatchSchema.safeParse(patch);
    if (!parsed.success) throw new UserError(firstIssue(parsed.error));

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_batch_update_media", { media_ids: idList.data, patch: parsed.data as Json });
    if (error) {
      console.error("[media] batch update failed:", error.code, error.message);
      if (error.code === "PGRST202" || error.code === "42883") throw new UserError("Prima aggiorna il database (supabase/update.sql): poi potrai modificare più foto insieme.");
      throw new UserError("Non sono riuscito a modificare le foto. Nessuna è stata cambiata.");
    }
    const rows = data ?? [];
    const done = new Set(rows.map((r) => r.id));
    const failed = idList.data.filter((id) => !done.has(id));

    // Keep only what "Annulla" needs: the previous values of the touched fields.
    const keys = snapshotKeys(parsed.data);
    const snapshot = rows.map((r) => {
      const prev = (r.previous ?? {}) as Record<string, unknown>;
      return { id: r.id, ...Object.fromEntries(keys.map((k) => [k, prev[k] ?? null])) };
    });
    const undoId = rows.length
      ? await audit({
          adminId: admin.id,
          action: "media.batch_update",
          table: "media",
          before: snapshot,
          after: { count: rows.length, fields: Object.keys(parsed.data), patch: parsed.data, at: rows[0].updated_at, failed: failed.length },
        })
      : null;

    revalidatePath("/", "layout");
    return { updated: rows.length, failed, undoId };
  });
}

/** "Annulla" right after a batch: restores the photos nobody edited since. */
export async function undoMediaBatch(auditId: string) {
  return safeAction(async () => {
    const admin = await assertAdmin();
    if (!z.uuid().safeParse(auditId).success) throw new UserError("Richiesta non valida.");
    const supabase = await createClient();
    const { data: entry } = await supabase.from("admin_audit_logs").select("*").eq("id", auditId).maybeSingle();
    if (!entry || entry.action !== "media.batch_update" || entry.admin_id !== admin.id) throw new UserError("Questa modifica non si può più annullare.");
    if (Date.now() - Date.parse(entry.created_at) > UNDO_MINUTES * 60_000) throw new UserError(`Si può annullare solo nei primi ${UNDO_MINUTES} minuti.`);
    const { count: already } = await supabase.from("admin_audit_logs").select("id", { count: "exact", head: true }).eq("action", "media.batch_undo").eq("target_id", auditId);
    if (already) throw new UserError("Questa modifica è già stata annullata.");

    const snapshot = Array.isArray(entry.before) ? entry.before : [];
    const at = (entry.after as { at?: string } | null)?.at;
    if (!at || !snapshot.length) throw new UserError("Questa modifica non si può più annullare.");
    const { data, error } = await supabase.rpc("admin_restore_media", { snapshot: snapshot as Json, batch_updated_at: at });
    if (error) {
      console.error("[media] batch undo failed:", error.code, error.message);
      throw new UserError("Non sono riuscito ad annullare. Le foto sono rimaste come dopo la modifica.");
    }
    const restored = (data ?? []).length;
    await audit({ adminId: admin.id, action: "media.batch_undo", table: "media", targetId: auditId, after: { restored, skipped: snapshot.length - restored } });
    revalidatePath("/", "layout");
    return { restored, skipped: snapshot.length - restored };
  });
}

/**
 * Deletes many photos: rows first (so nothing points to a missing file),
 * then their files in storage. Content that used a photo keeps its text.
 */
export async function batchDeleteMedia(ids: string[]) {
  return safeAction(async () => {
    const admin = await assertAdmin();
    const idList = batchIdsSchema.safeParse(ids);
    if (!idList.success) throw new UserError(firstIssue(idList.error));
    const supabase = await createClient();

    const deleted: { id: string; title: string | null; path: string; thumb_path: string | null }[] = [];
    for (const part of chunks(idList.data)) {
      const { data, error } = await supabase.from("media").delete().in("id", part).select("id, title, path, thumb_path");
      if (error) {
        console.error("[media] batch delete failed:", error.code, error.message);
        break;
      }
      deleted.push(...(data ?? []));
    }
    const gone = new Set(deleted.map((d) => d.id));
    const failed = idList.data.filter((id) => !gone.has(id));

    let filesLeft = 0;
    const paths = deleted.flatMap((d) => [d.path, d.thumb_path].filter((p): p is string => Boolean(p)));
    for (const part of chunks(paths)) {
      const { error } = await supabase.storage.from("media").remove(part);
      if (error) filesLeft += part.length;
    }
    if (filesLeft) console.error(`[media] batch delete: ${filesLeft} files could not be removed from storage`);

    if (deleted.length) {
      await audit({
        adminId: admin.id,
        action: "media.batch_delete",
        table: "media",
        after: { count: deleted.length, titles: deleted.slice(0, 20).map((d) => d.title).filter(Boolean), failed: failed.length },
      });
    }
    revalidatePath("/", "layout");
    return { deleted: deleted.length, failed, filesLeft };
  });
}
