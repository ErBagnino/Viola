import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getResource, parseUpdate, type ResourceDef } from "@/features/admin/resources";
import { assertAdmin } from "@/server/auth";
import { audit } from "@/server/audit";
import { UserError } from "@/server/action-result";

type Row = Record<string, unknown> & { id: string };

// The registry decides the table at runtime; the typed client can't express
// that, so we use an untyped view of it here (all input is Zod-validated).
async function db() {
  const supabase = await createClient();
  return supabase as unknown as {
    from: (t: string) => {
      select: (c?: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
      insert: (v: unknown) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
      update: (v: unknown) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
      delete: () => any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
  };
}

export function requireResource(key: string): ResourceDef {
  const def = getResource(key);
  if (!def) throw new UserError("Sezione sconosciuta");
  return def;
}

function firstIssue(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const i = error.issues[0];
  return i ? `${i.path.join(".") || "campo"}: ${i.message}` : "Dati non validi";
}

export async function listRows(key: string, opts: { limit?: number; filter?: Record<string, string> } = {}): Promise<Row[]> {
  await assertAdmin();
  const def = requireResource(key);
  const client = await db();
  let q = client.from(def.table).select("*");
  for (const [k, v] of Object.entries(opts.filter ?? {})) q = q.eq(k, v);
  for (const o of def.order) q = q.order(o.column, { ascending: o.ascending, nullsFirst: false });
  const { data, error } = await q.limit(opts.limit ?? 1000);
  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function getRow(key: string, id: string): Promise<Row | null> {
  await assertAdmin();
  const def = requireResource(key);
  const client = await db();
  const { data } = await client.from(def.table).select("*").eq("id", id).maybeSingle();
  return (data as Row) ?? null;
}

export async function createRow(key: string, input: Record<string, unknown>): Promise<Row> {
  const admin = await assertAdmin();
  const def = requireResource(key);
  if (def.noCreate) throw new UserError("Questo elemento si crea in un altro modo (es. caricando un file).");
  const parsed = def.schema.safeParse(input);
  if (!parsed.success) throw new UserError(firstIssue(parsed.error));
  const problem = def.check?.(parsed.data);
  if (problem) throw new UserError(problem);
  const client = await db();

  // New sortable items go to the end.
  if (def.sortable && !("position" in input)) {
    const { data: last } = await client.from(def.table).select("position").order("position", { ascending: false }).limit(1);
    (parsed.data as Record<string, unknown>).position = ((last?.[0]?.position as number) ?? 0) + 10;
  }
  deriveMediaFlags(def, parsed.data as Record<string, unknown>);
  const { data, error } = await client.from(def.table).insert(parsed.data).select("*").single();
  if (error) throw mapDbError(error);
  await audit({ adminId: admin.id, action: "create", table: def.table, targetId: (data as Row).id, after: data });
  return data as Row;
}

export async function updateRow(key: string, id: string, input: Record<string, unknown>): Promise<Row> {
  const admin = await assertAdmin();
  const def = requireResource(key);
  const parsed = parseUpdate(def, input);
  if (!parsed.success) throw new UserError(firstIssue(parsed.error));
  const before = await getRow(key, id);
  if (!before) throw new UserError("Elemento non trovato");
  const problem = def.check?.({ ...before, ...parsed.data });
  if (problem) throw new UserError(problem);
  deriveMediaFlags(def, parsed.data as Record<string, unknown>);
  const client = await db();
  const { data, error } = await client.from(def.table).update(parsed.data).eq("id", id).select("*").single();
  if (error) throw mapDbError(error);
  await audit({ adminId: admin.id, action: "update", table: def.table, targetId: id, before, after: data });
  return data as Row;
}

export async function deleteRow(key: string, id: string): Promise<void> {
  const admin = await assertAdmin();
  const def = requireResource(key);
  const before = await getRow(key, id);
  if (!before) throw new UserError("Elemento non trovato");
  if (def.table === "media") {
    // Remove the files first so nothing is left behind taking up free storage.
    const supabase = await createClient();
    const paths = [before.path, before.thumb_path].filter((p): p is string => typeof p === "string" && p.length > 0);
    const { error: rmErr } = await supabase.storage.from("media").remove(paths);
    if (rmErr) throw rmErr;
  }
  const client = await db();
  const { error } = await client.from(def.table).delete().eq("id", id);
  if (error) throw mapDbError(error);
  await audit({ adminId: admin.id, action: "delete", table: def.table, targetId: id, before });
}

export async function reorderRows(key: string, ids: string[]): Promise<void> {
  const admin = await assertAdmin();
  const def = requireResource(key);
  if (!def.sortable) throw new UserError("Questa sezione non si può riordinare");
  const client = await db();
  await Promise.all(ids.map((id, i) => client.from(def.table).update({ position: (i + 1) * 10 }).eq("id", id)));
  await audit({ adminId: admin.id, action: "reorder", table: def.table, after: ids });
}

/** Media flags follow the chosen contexts (single source of truth in the UI). */
export function deriveMediaFlags(def: ResourceDef, data: Record<string, unknown>) {
  if (def.table !== "media" || !Array.isArray(data.contexts)) return;
  data.breathing_enabled = data.contexts.includes("breathing");
  data.ai_avatar_enabled = data.contexts.includes("adam_ai");
}

function mapDbError(error: { code?: string; message?: string }) {
  if (error.code === "23505") return new UserError("Esiste già un elemento con questo valore (es. codice duplicato).");
  if (error.code === "23514") return new UserError("Un valore non è valido.");
  if (error.code === "42501") return new UserError("Permesso negato.");
  console.error("[admin-crud]", error);
  return new Error(error.message ?? "db error");
}
