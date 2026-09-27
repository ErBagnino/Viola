import { AdminHeader } from "@/components/layout/admin-header";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/settings";
import { formatDateTime } from "@/utils/dates";
import Link from "next/link";
import { describeAudit } from "@/features/admin/audit-labels";

export const metadata = { title: "Registro" };


export default async function RegistroPage({ searchParams }: PageProps<"/admin/registro">) {
  const { tab = "audit" } = await searchParams;
  const settings = await getSettings();
  const tz = settings.general.timezone;
  const supabase = await createClient();
  const tabs = [
    { key: "audit", label: "Azioni admin" },
    { key: "ai", label: "Strumenti AI" },
    { key: "activity", label: "Attività di Viola" },
  ];
  let rows: { id: string; when: string; title: string; detail: string; ok?: boolean }[] = [];
  if (tab === "ai") {
    const { data } = await supabase.from("ai_tool_logs").select("*").order("created_at", { ascending: false }).limit(150);
    rows = (data ?? []).map((l) => ({ id: l.id, when: l.created_at, title: `${l.scope} · ${l.tool} · ${l.status}`, detail: JSON.stringify(l.args).slice(0, 220), ok: l.success }));
  } else if (tab === "activity") {
    const { data } = await supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(150);
    rows = (data ?? []).map((a) => ({ id: a.id, when: a.created_at, title: a.type.replace(/_/g, " "), detail: JSON.stringify(a.payload).slice(0, 200) }));
  } else {
    const { data } = await supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(150);
    rows = (data ?? []).map((a) => ({ id: a.id, when: a.created_at, title: describeAudit(a).text, detail: a.after ? JSON.stringify(a.after).slice(0, 220) : a.before ? `prima: ${JSON.stringify(a.before).slice(0, 200)}` : "" }));
  }
  return (
    <div>
      <AdminHeader title="Registro" description="Chi ha fatto cosa e quando. Le chiavi segrete non vengono mai salvate." icon="book" />
      <nav className="mb-4 flex gap-1 rounded-2xl bg-tint-50 p-1" aria-label="Registri">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/registro?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} className={`flex-1 rounded-xl px-3 py-2 text-center text-sm font-bold ${tab === t.key ? "bg-surface text-vio-800 shadow-soft" : "text-vio-600"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <ul className="space-y-2">
        {rows.length === 0 && <li className="text-sm text-ink-muted">Niente da mostrare.</li>}
        {rows.map((r) => (
          <li key={r.id} className="paper rounded-2xl px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className={r.ok === false ? "text-rouge-600" : "text-vio-900"}>{r.title}</b>
              <span className="text-xs text-ink-muted">{formatDateTime(r.when, tz)}</span>
            </div>
            {r.detail && <p className="mt-1 font-mono text-xs break-all text-ink-soft">{r.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
