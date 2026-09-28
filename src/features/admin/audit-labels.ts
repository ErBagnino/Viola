// Human sentences for the admin audit log ("Ultime cose che hai sistemato").
import { SETTINGS_FORMS } from "@/features/settings/fields";
import type { SettingsKey } from "@/features/settings/schema";
import { TASKS } from "@/features/readiness/tasks";
import { RESOURCES, type ResourceDef } from "./resources";
import { batchSentence } from "./media-batch";

export type AuditRow = { action: string; target_table: string | null; target_id: string | null; before: unknown; after: unknown };

const byTable = new Map<string, ResourceDef>(Object.values(RESOURCES as Record<string, ResourceDef>).map((d) => [d.table, d]));

function titleOf(v: unknown): string | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  for (const k of ["title", "question", "name", "key", "text"]) {
    if (typeof o[k] === "string" && o[k]) {
      const t = (o[k] as string).replace(/\s+/g, " ").trim();
      return t.length > 60 ? `${t.slice(0, 57)}…` : t;
    }
  }
  return null;
}

export function describeAudit(a: AuditRow): { text: string; href: string | null } {
  const def = a.target_table ? byTable.get(a.target_table) : undefined;
  const what = def?.singular.toLowerCase() ?? "elemento";
  const title = titleOf(a.after) ?? titleOf(a.before);
  const named = title ? `: “${title}”` : "";
  const href = def ? `/admin/${def.slug}` : null;
  switch (a.action) {
    case "create":
      return { text: `Hai aggiunto ${what}${named}`, href };
    case "update":
      return { text: `Hai modificato ${what}${named}`, href };
    case "delete":
      return { text: a.target_table === "messages" ? "Hai eliminato un messaggio" : `Hai eliminato ${what}${named}`, href: a.target_table === "messages" ? "/admin/messaggi" : href };
    case "reorder":
      return { text: `Hai riordinato: ${def?.label ?? "elenco"}`, href };
    case "upload":
      return { text: `Hai caricato un file${named}`, href: "/admin/foto" };
    case "settings":
    case "ai_config": {
      const form = a.target_id ? SETTINGS_FORMS[a.target_id as SettingsKey] : undefined;
      const label = form?.title ?? a.target_id ?? "impostazioni";
      return { text: `Hai cambiato le impostazioni: ${label}`, href: a.action === "ai_config" ? "/admin/ai" : a.target_id === "notifications" ? "/admin/notifiche" : "/admin/impostazioni" };
    }
    case "import":
      return { text: "Hai importato un backup", href: "/admin/backup" };
    case "export":
      return { text: "Hai scaricato un backup", href: "/admin/backup" };
    case "request_responded":
      return { text: "Hai risposto a \"Ho bisogno di Adam\"", href: "/admin/richieste" };
    case "message_replied":
      return { text: "Hai risposto a un messaggio", href: "/admin/messaggi" };
    case "message_read":
      return { text: "Hai letto un messaggio", href: "/admin/messaggi" };
    case "readiness.done":
    case "readiness.skipped":
    case "readiness.reset": {
      const task = TASKS.find((t) => t.id === a.target_id);
      const name = task ? `“${task.title}”` : "un passaggio";
      const text = a.action === "readiness.done" ? `Hai spuntato ${name}` : a.action === "readiness.skipped" ? `Hai tolto ${name} (non ti serve)` : `Hai rimesso da fare ${name}`;
      return { text, href: "/admin/completa" };
    }
    case "media.batch_update": {
      const after = (a.after ?? {}) as { count?: number; fields?: string[] };
      return { text: batchSentence(after.fields ?? [], after.count ?? 0), href: "/admin/foto" };
    }
    case "media.batch_undo": {
      const after = (a.after ?? {}) as { restored?: number };
      return { text: `Hai annullato la modifica di ${after.restored === 1 ? "1 foto" : `${after.restored ?? 0} foto`}`, href: "/admin/foto" };
    }
    case "media.batch_delete": {
      const after = (a.after ?? {}) as { count?: number };
      return { text: `Hai eliminato ${after.count === 1 ? "1 foto" : `${after.count ?? 0} foto`}`, href: "/admin/foto" };
    }
    default:
      if (a.action.startsWith("request_")) return { text: "Hai aggiornato una richiesta", href: "/admin/richieste" };
      return { text: `${a.action}${def ? ` · ${def.label}` : ""}`, href };
  }
}
