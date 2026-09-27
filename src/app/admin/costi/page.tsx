import { AdminHeader } from "@/components/layout/admin-header";
import { SettingsForm } from "@/features/settings/settings-form";
import { SETTINGS_FORMS } from "@/features/settings/fields";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/settings";
import { isoDaysAgo, todayKey } from "@/utils/dates";
import { cn } from "@/utils/cn";

export const metadata = { title: "Costi e limiti" };

function Meter({ label, used, limit, unit, warn, note }: { label: string; used: number; limit: number; unit: string; warn: number; note?: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const level = pct >= 90 ? "danger" : pct >= warn ? "warn" : "ok";
  return (
    <div className="paper rounded-4xl p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-vio-900">{label}</h3>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-extrabold", level === "ok" ? "bg-green-100 text-green-800" : level === "warn" ? "bg-peach-100 text-vio-800" : "bg-rouge-500 text-white")}>
          {level === "ok" ? "OK" : level === "warn" ? "ATTENZIONE" : "VICINO AL LIMITE"}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {used.toLocaleString("it-IT", { maximumFractionDigits: 1 })} / {limit.toLocaleString("it-IT")} {unit} ({pct.toFixed(0)}%)
      </p>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-tint-100" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cn("h-full rounded-full", level === "ok" ? "bg-wine-500" : level === "warn" ? "bg-peach-400" : "bg-rouge-500")} style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="mt-2 text-xs text-ink-muted">{note}</p>}
    </div>
  );
}

export default async function CostiPage() {
  const settings = await getSettings();
  const supabase = await createClient();
  const { cost, ai } = settings;
  const [{ data: stats }, { data: usage }] = await Promise.all([
    supabase.rpc("admin_usage_stats"),
    supabase.from("ai_usage_daily").select("*").gte("day", todayKey(settings.general.timezone, new Date(isoDaysAgo(29)))),
  ]);
  const s = (stats ?? {}) as { db_bytes?: number; media_bytes?: number; media_count?: number; notifications_month?: Record<string, number> };
  const today = todayKey(settings.general.timezone);
  const todayRows = (usage ?? []).filter((u) => u.day === today);
  const req = (scope: string) => todayRows.filter((u) => u.scope === scope).reduce((a, u) => a + u.requests, 0);
  const tokensToday = todayRows.reduce((a, u) => a + u.input_tokens + u.output_tokens, 0);
  const month = (usage ?? []).reduce((a, u) => a + u.requests, 0);
  const notif = s.notifications_month ?? {};

  return (
    <div className="space-y-5">
      <AdminHeader title="Costi e limiti" description="Tutto è pensato per restare a €0/mese. Qui vedi quanto manca ai limiti gratuiti." icon="target" />
      <div className="grid gap-3 md:grid-cols-2">
        <Meter label="Adam AI oggi (Viola)" used={req("viola")} limit={ai.dailyMessageLimit} unit="richieste" warn={cost.warnPercent} note="Limite impostato da te. Il free tier di Gemini ha anche limiti propri: se li raggiungi Adam AI si mette in pausa, non paghi nulla." />
        <Meter label="AI Copilot oggi" used={req("copilot")} limit={ai.copilotDailyLimit} unit="richieste" warn={cost.warnPercent} />
        <Meter label="Token AI oggi" used={tokensToday} limit={ai.dailyTokenBudget} unit="token" warn={cost.warnPercent} />
        <Meter label="Database" used={(s.db_bytes ?? 0) / 1024 / 1024} limit={cost.dbLimitMb} unit="MB" warn={cost.warnPercent} note="Supabase Free: 500 MB di database." />
        <Meter label="Storage foto e audio" used={(s.media_bytes ?? 0) / 1024 / 1024} limit={cost.storageLimitMb} unit="MB" warn={cost.warnPercent} note={`${s.media_count ?? 0} file. Supabase Free: 1 GB di storage. Le foto sono compresse in WebP (~200-400 KB l'una).`} />
        <div className="paper rounded-4xl p-5">
          <h3 className="font-display text-lg font-semibold text-vio-900">Notifiche questo mese</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Telegram: <b>{notif.telegram ?? 0}</b> · Web Push: <b>{notif.webpush ?? 0}</b>
          </p>
          <p className="mt-2 text-xs text-ink-muted">Telegram Bot API e Web Push sono gratuiti e senza limiti rilevanti per questo uso. WhatsApp è solo un link (gratis).</p>
          <p className="mt-3 text-sm text-ink-soft">
            Richieste AI negli ultimi 30 giorni: <b>{month}</b>
          </p>
        </div>
      </div>
      <section className="paper rounded-4xl p-5 text-sm text-ink-soft">
        <h3 className="font-display text-lg font-semibold text-vio-900">Traffico (bandwidth)</h3>
        <p className="mt-1">Non è misurabile dall&apos;app. Controllalo nelle dashboard gratuite: Supabase → Project → Usage (5 GB di egress/mese nel piano Free) e Vercel → Usage (100 GB/mese nel piano Hobby). Per due persone sei molto lontano dai limiti.</p>
      </section>
      <SettingsForm settingsKey="cost" title={SETTINGS_FORMS.cost!.title} description={SETTINGS_FORMS.cost!.description} fields={SETTINGS_FORMS.cost!.fields} initial={cost} />
    </div>
  );
}
