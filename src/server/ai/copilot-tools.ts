import "server-only";
import type { FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { ChatAction } from "@/features/ai-chat/types";
import type { Json } from "@/db/database.types";
import { RESOURCES, type FieldDef, type ResourceDef } from "@/features/admin/resources";
import { APP_ACTION_KEYS } from "@/features/actions/registry";
import { TONE_OPTIONS } from "@/features/content/constants";
import { isSettingsKey, parseSettings, PUBLIC_SETTINGS, settingsSchemas, type SettingsKey } from "@/features/settings/schema";
import { SETTINGS_FORMS } from "@/features/settings/fields";
import { createRow, deleteRow, getRow, listRows, updateRow } from "@/server/admin/crud";
import { audit } from "@/server/audit";
import { UserError } from "@/server/action-result";

// ---------------------------------------------------------------------------
// Safe, explicit tools for the admin AI Copilot. No SQL, no files, no code:
// every tool maps to a registry resource and is validated with Zod.
// Destructive operations (delete / disable) require Adam's confirmation.
// ---------------------------------------------------------------------------

type Schema = Record<string, unknown>;
type Ctx = { supabase: ServerSupabase; adminId: string; conversationId: string };
type Outcome = { result: Record<string, unknown>; actions: ChatAction[] };

type Tool = {
  decl: FunctionDeclaration;
  /** returns a confirmation question when the call is destructive */
  confirm?: (args: Record<string, unknown>) => Promise<string | null>;
  run: (args: Record<string, unknown>, ctx: Ctx) => Promise<Outcome>;
};

const PLURAL: Record<string, string> = {
  dedication: "dedications",
  memory: "memories",
  comfort_action: "comfort_actions",
  breathing_preset: "breathing_presets",
  countdown: "countdowns",
  time_capsule: "time_capsules",
  open_when: "open_when",
  daily_surprise: "daily_surprises",
  home_module: "home_modules",
  phrase: "phrases",
  ai_memory: "ai_memory",
  media: "media",
};

const OFF_FIELDS = ["is_published", "is_active", "is_enabled", "enabled"];

function fieldSchema(f: FieldDef): Schema {
  const description = [f.label, f.hint].filter(Boolean).join(" — ");
  switch (f.type) {
    case "number":
    case "weight":
      return { type: "number", description };
    case "boolean":
      return { type: "boolean", description };
    case "select":
      return f.options?.length ? { type: "string", enum: f.options.map((o) => o.value), description } : { type: "string", description };
    case "action":
      return { type: "string", enum: APP_ACTION_KEYS, description };
    case "color":
      return { type: "string", enum: Object.keys(TONE_OPTIONS), description };
    case "date":
      return { type: "string", description: `${description} (formato YYYY-MM-DD)` };
    case "datetime":
      return { type: "string", description: `${description} (ISO 8601 con fuso, es. 2026-09-04T09:00:00+02:00)` };
    case "image":
    case "audio":
      return { type: "string", description: `${description} (id del file nella libreria, da list_media)` };
    case "tags":
    case "list":
      return { type: "array", items: { type: "string" }, description };
    case "contexts":
      return { type: "array", items: { type: "string", enum: (f.options ?? []).map((o) => o.value) }, description };
    case "steps":
      return {
        type: "array",
        description,
        items: { type: "object", properties: { title: { type: "string" }, text: { type: "string" }, count: { type: "number" }, emoji: { type: "string" } }, required: ["title"] },
      };
    default:
      return { type: "string", description };
  }
}

function paramsFor(def: ResourceDef, mode: "create" | "update"): Schema {
  const properties: Record<string, Schema> = {};
  const required: string[] = [];
  if (mode === "update") {
    properties.id = { type: "string", description: `id di ${def.singular.toLowerCase()} (da list_${PLURAL[(def.copilot as { name: string }).name]})` };
    required.push("id");
  }
  for (const f of def.fields) {
    if (!(f.name in def.schema.shape)) continue;
    properties[f.name] = fieldSchema(f);
    if (mode === "create" && f.required) required.push(f.name);
  }
  return { type: "object", properties, required };
}

function compact(def: ResourceDef, row: Record<string, unknown>) {
  const out: Record<string, unknown> = { id: row.id };
  const keep = [def.titleField, def.subtitleField, def.badgeField, def.toggleField, "category", "kind", "target_at", "unlock_at", "happened_on", "scheduled_on", "created_at"];
  for (const k of keep) {
    if (!k || !(k in row) || row[k] === null) continue;
    const v = row[k];
    out[k] = typeof v === "string" && v.length > 140 ? `${v.slice(0, 140)}…` : v;
  }
  return out;
}

function titleOf(def: ResourceDef, row: Record<string, unknown> | null) {
  const t = row?.[def.titleField];
  return typeof t === "string" && t ? t.slice(0, 80) : def.singular;
}

function resourceTools(): Record<string, Tool> {
  const tools: Record<string, Tool> = {};
  for (const def of Object.values(RESOURCES) as ResourceDef[]) {
    if (!def.copilot) continue;
    const { name, create, update, delete: del, list } = def.copilot;
    const plural = PLURAL[name] ?? `${name}s`;

    if (create) {
      tools[`create_${name}`] = {
        decl: { name: `create_${name}`, description: `Crea ${def.singular.toLowerCase()} (${def.label}). ${def.description}`, parametersJsonSchema: paramsFor(def, "create") },
        run: async (args) => {
          const row = await createRow(def.key, args);
          return { result: { creato: compact(def, row) }, actions: [{ type: "tool", tool: `create_${name}`, summary: `Creato: ${titleOf(def, row)}`, ok: true }] };
        },
      };
    }
    if (update) {
      tools[`update_${name}`] = {
        decl: { name: `update_${name}`, description: `Modifica ${def.singular.toLowerCase()} esistente (solo i campi passati).`, parametersJsonSchema: paramsFor(def, "update") },
        confirm: async (args) => {
          const disabling = OFF_FIELDS.some((f) => args[f] === false) || (def.table === "media" && args.visibility === "private");
          if (!disabling) return null;
          const row = await getRow(def.key, String(args.id ?? "")).catch(() => null);
          return `Disattivare ${def.singular.toLowerCase()} "${titleOf(def, row)}"? Viola non lo vedrà più.`;
        },
        run: async (args) => {
          const { id, ...rest } = args;
          const row = await updateRow(def.key, z.uuid().parse(id), rest);
          return { result: { aggiornato: compact(def, row) }, actions: [{ type: "tool", tool: `update_${name}`, summary: `Aggiornato: ${titleOf(def, row)}`, ok: true }] };
        },
      };
    }
    if (del) {
      tools[`delete_${name}`] = {
        decl: { name: `delete_${name}`, description: `Elimina ${def.singular.toLowerCase()} (chiede conferma ad Adam).`, parametersJsonSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
        confirm: async (args) => {
          const row = await getRow(def.key, String(args.id ?? "")).catch(() => null);
          if (!row) throw new UserError("Elemento non trovato");
          return `Eliminare per sempre ${def.singular.toLowerCase()} "${titleOf(def, row)}"?`;
        },
        run: async (args) => {
          const id = z.uuid().parse(args.id);
          const row = await getRow(def.key, id);
          await deleteRow(def.key, id);
          return { result: { eliminato: id }, actions: [{ type: "tool", tool: `delete_${name}`, summary: `Eliminato: ${titleOf(def, row)}`, ok: true }] };
        },
      };
    }
    if (list) {
      tools[`list_${plural}`] = {
        decl: {
          name: `list_${plural}`,
          description: `Elenca ${def.label.toLowerCase()} (id, titolo e campi principali).`,
          parametersJsonSchema: { type: "object", properties: { cerca: { type: "string", description: "testo da cercare nel titolo" }, limite: { type: "number" } } },
        },
        run: async (args) => {
          const rows = await listRows(def.key, { limit: 300 });
          const q = typeof args.cerca === "string" ? args.cerca.toLowerCase() : "";
          const filtered = rows.filter((r) => !q || JSON.stringify(compact(def, r)).toLowerCase().includes(q));
          const limit = Math.min(40, Math.max(1, Number(args.limite) || 20));
          return { result: { totale: filtered.length, elementi: filtered.slice(0, limit).map((r) => compact(def, r)) }, actions: [] };
        },
      };
    }
  }
  return tools;
}

function coerceSetting(current: unknown, raw: unknown) {
  if (typeof current === "number") return Number(raw);
  if (typeof current === "boolean") return raw === true || raw === "true" || raw === "sì" || raw === "si";
  if (Array.isArray(current)) return Array.isArray(raw) ? raw : String(raw).split("\n").map((s) => s.trim()).filter(Boolean);
  return raw === null ? null : String(raw);
}

function extraTools(): Record<string, Tool> {
  const settingsKeys = Object.keys(SETTINGS_FORMS) as SettingsKey[];
  return {
    create_media_record: {
      decl: {
        name: "create_media_record",
        description: "Registra/aggiunge una foto GIÀ caricata (id da un allegato o da list_media) a una o più sezioni (galleria, respirazione, ecc.) con titolo e didascalia.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            media_id: { type: "string" },
            title: { type: "string" },
            caption: { type: "string" },
            category: { type: "string" },
            taken_on: { type: "string", description: "YYYY-MM-DD" },
            contexts: { type: "array", items: { type: "string", enum: ["gallery", "breathing", "home", "adam_ai", "dedications", "memories", "surprises"] } },
          },
          required: ["media_id"],
        },
      },
      run: async (args) => {
        const { media_id, ...rest } = args;
        const row = await updateRow("media", z.uuid().parse(media_id), rest);
        return { result: { foto: compact(RESOURCES.media, row) }, actions: [{ type: "tool", tool: "create_media_record", summary: `Foto aggiornata: ${row.title ?? "senza titolo"}`, ok: true }] };
      },
    },
    list_messages: {
      decl: {
        name: "list_messages",
        description: "Elenca i messaggi che Viola ha scritto ad Adam nell'app.",
        parametersJsonSchema: { type: "object", properties: { solo_da_leggere: { type: "boolean" }, limite: { type: "number" } } },
      },
      run: async (args, { supabase }) => {
        let q = supabase.from("messages").select("id, body, category, is_private, read_at, reply, created_at").order("created_at", { ascending: false });
        if (args.solo_da_leggere) q = q.is("read_at", null);
        const { data } = await q.limit(Math.min(30, Number(args.limite) || 15));
        return { result: { messaggi: (data ?? []).map((m) => ({ ...m, body: m.body.slice(0, 400) })) }, actions: [] };
      },
    },
    mark_message_read: {
      decl: { name: "mark_message_read", description: "Segna un messaggio di Viola come letto.", parametersJsonSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
      run: async (args, { supabase, adminId }) => {
        const id = z.uuid().parse(args.id);
        const { error } = await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        await audit({ adminId, action: "message_read", table: "messages", targetId: id });
        return { result: { letto: id }, actions: [{ type: "tool", tool: "mark_message_read", summary: "Messaggio segnato come letto", ok: true }] };
      },
    },
    list_mood_entries: {
      decl: { name: "list_mood_entries", description: "Elenca l'umore condiviso da Viola (1=malissimo … 5=benissimo, null=non lo so).", parametersJsonSchema: { type: "object", properties: { giorni: { type: "number" } } } },
      run: async (args, { supabase }) => {
        const days = Math.min(90, Math.max(1, Number(args.giorni) || 14));
        const { data } = await supabase.from("mood_entries").select("mood, note, created_at").gte("created_at", new Date(Date.now() - days * 86400_000).toISOString()).order("created_at", { ascending: false }).limit(100);
        return { result: { umore: data ?? [] }, actions: [] };
      },
    },
    list_requests: {
      decl: { name: "list_requests", description: "Elenca le ultime richieste 'Ho bisogno di Adam' con stato e canali di notifica.", parametersJsonSchema: { type: "object", properties: { limite: { type: "number" } } } },
      run: async (args, { supabase }) => {
        const { data } = await supabase.from("adam_requests").select("id, message, status, notified_channels, notification_ok, response, created_at").order("created_at", { ascending: false }).limit(Math.min(30, Number(args.limite) || 10));
        return { result: { richieste: data ?? [] }, actions: [] };
      },
    },
    get_app_settings: {
      decl: {
        name: "get_app_settings",
        description: "Legge un gruppo di impostazioni dell'app.",
        parametersJsonSchema: { type: "object", properties: { key: { type: "string", enum: settingsKeys } }, required: ["key"] },
      },
      run: async (args, { supabase }) => {
        const key = String(args.key);
        if (!isSettingsKey(key)) throw new UserError("Gruppo di impostazioni sconosciuto");
        const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
        return { result: { key, valori: parseSettings(key, data?.value), campi: SETTINGS_FORMS[key]?.fields.map((f) => `${f.name}: ${f.label}`) }, actions: [] };
      },
    },
    update_app_settings: {
      decl: {
        name: "update_app_settings",
        description: "Modifica una o più impostazioni di un gruppo (usa prima get_app_settings per vedere i campi).",
        parametersJsonSchema: {
          type: "object",
          properties: {
            key: { type: "string", enum: settingsKeys },
            changes: {
              type: "array",
              items: { type: "object", properties: { field: { type: "string" }, value: { type: "string", description: "Nuovo valore (per le liste: una voce per riga)" } }, required: ["field", "value"] },
            },
          },
          required: ["key", "changes"],
        },
      },
      confirm: async (args) => {
        const changes = Array.isArray(args.changes) ? (args.changes as { field: string; value: unknown }[]) : [];
        const off = changes.filter((c) => c.value === false || c.value === "false");
        return off.length ? `Disattivare ${off.map((c) => c.field).join(", ")} in "${String(args.key)}"?` : null;
      },
      run: async (args, { supabase, adminId }) => {
        const key = String(args.key);
        if (!isSettingsKey(key)) throw new UserError("Gruppo di impostazioni sconosciuto");
        const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
        const current = parseSettings(key, data?.value) as Record<string, unknown>;
        const next = { ...current };
        const changes = z.array(z.object({ field: z.string(), value: z.unknown() })).max(30).parse(args.changes);
        for (const c of changes) {
          if (!(c.field in current)) throw new UserError(`Campo sconosciuto: ${c.field}`);
          next[c.field] = coerceSetting(current[c.field], c.value);
        }
        const parsed = settingsSchemas[key].safeParse(next);
        if (!parsed.success) throw new UserError(`Valore non valido: ${parsed.error.issues[0]?.path.join(".")}`);
        const { error } = await supabase.from("app_settings").upsert({ key, value: parsed.data as NonNullable<Json>, is_public: PUBLIC_SETTINGS.includes(key), updated_by: adminId }, { onConflict: "key" });
        if (error) throw error;
        await audit({ adminId, action: key.startsWith("ai") ? "ai_config" : "settings", table: "app_settings", targetId: key, before: current, after: parsed.data });
        return { result: { aggiornato: key, campi: changes.map((c) => c.field) }, actions: [{ type: "tool", tool: "update_app_settings", summary: `Impostazioni "${key}" aggiornate`, ok: true }] };
      },
    },
  };
}

let cache: Record<string, Tool> | null = null;
export function copilotTools() {
  cache ??= { ...resourceTools(), ...extraTools() };
  return cache;
}

export function copilotDeclarations(): FunctionDeclaration[] {
  return Object.values(copilotTools()).map((t) => t.decl);
}

function sanitizeArgs(args: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(args, (_k, v) => (typeof v === "string" && v.length > 2000 ? `${v.slice(0, 2000)}…` : v)));
}

/** Runs (or queues for confirmation) a copilot tool and logs it. */
export async function runCopilotTool(name: string, args: Record<string, unknown>, ctx: Ctx): Promise<Outcome> {
  const tool = copilotTools()[name];
  const log = (row: { status: "executed" | "pending" | "failed"; success: boolean; result: unknown }) =>
    ctx.supabase
      .from("ai_tool_logs")
      .insert({ conversation_id: ctx.conversationId, user_id: ctx.adminId, scope: "copilot", tool: name, args: sanitizeArgs(args), result: (row.result ?? null) as Json, success: row.success, status: row.status })
      .select("id")
      .single();

  if (!tool) {
    await log({ status: "failed", success: false, result: { errore: "strumento sconosciuto" } });
    return { result: { errore: "strumento sconosciuto" }, actions: [] };
  }
  try {
    const question = tool.confirm ? await tool.confirm(args) : null;
    if (question) {
      const { data } = await log({ status: "pending", success: false, result: { domanda: question } });
      return {
        result: { stato: "in_attesa_di_conferma", nota: "Adam deve confermare con il pulsante mostrato nella chat. Non ripetere lo strumento." },
        actions: [{ type: "confirm", logId: data?.id ?? "", tool: name, summary: question, state: "pending" }],
      };
    }
    const out = await tool.run(args, ctx);
    await log({ status: "executed", success: true, result: out.result });
    return out;
  } catch (e) {
    const msg = e instanceof UserError || e instanceof z.ZodError ? (e instanceof z.ZodError ? "dati non validi" : e.message) : "errore interno";
    if (msg === "errore interno") console.error(`[copilot] tool failed ${JSON.stringify({ tool: name, message: e instanceof Error ? e.message.slice(0, 200) : "?" })}`);
    await log({ status: "failed", success: false, result: { errore: msg } });
    return { result: { errore: msg }, actions: [{ type: "tool", tool: name, summary: `Non riuscito: ${msg}`, ok: false }] };
  }
}

/** Executes a previously queued destructive tool after Adam confirmed. */
export async function executeConfirmed(name: string, args: Record<string, unknown>, ctx: Ctx) {
  const tool = copilotTools()[name];
  if (!tool) throw new UserError("Strumento sconosciuto");
  return tool.run(args, ctx);
}
