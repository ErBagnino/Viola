import { AdminHeader } from "@/components/layout/admin-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/settings";
import { MOODS } from "@/features/content/constants";
import { formatDate, formatDateTime, isoDaysAgo, lastDaysKeys, todayKey } from "@/utils/dates";

export const metadata = { title: "Umore" };

export default async function UmoreAdminPage() {
  const supabase = await createClient();
  const settings = await getSettings();
  const since = isoDaysAgo(30);
  const { data } = await supabase.from("mood_entries").select("*").gte("created_at", since).order("created_at", { ascending: false });
  const list = data ?? [];
  const tz = settings.general.timezone;
  const days = lastDaysKeys(30, new Date(), tz).map((key) => {
    const entries = list.filter((m) => todayKey(tz, new Date(m.created_at)) === key && m.mood);
    const avg = entries.length ? entries.reduce((s, m) => s + (m.mood ?? 0), 0) / entries.length : null;
    return { key, avg, n: entries.length };
  });
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Umore"
        description={`Solo gli stati d'animo che ${settings.general.violaName} ha scelto di condividere. Non è una diagnosi: è un modo per sapere quando scriverle.`}
        icon="smile"
      />
      <section className="paper rounded-4xl p-5">
        <h2 className="font-display text-lg font-semibold text-vio-900">Ultimi 30 giorni</h2>
        <div className="mt-4 flex h-36 items-end gap-1" role="img" aria-label="Andamento dell'umore negli ultimi 30 giorni">
          {days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center justify-end" title={`${formatDate(d.key)}${d.avg ? ` · ${d.avg.toFixed(1)}/5` : ""}`}>
              <div className="w-full rounded-t-md bg-gradient-to-t from-wine-500 to-blush-300" style={{ height: d.avg ? `${(d.avg / 5) * 100}%` : "2px", opacity: d.avg ? 1 : 0.25 }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-bold text-ink-muted">
          <span>{formatDate(days[0].key, { day: "numeric", month: "short" })}</span>
          <span>oggi</span>
        </div>
      </section>
      {list.length === 0 ? (
        <EmptyState title="Nessun umore condiviso" />
      ) : (
        <ul className="space-y-2">
          {list.map((m) => (
            <li key={m.id} className="paper flex items-center gap-3 rounded-3xl p-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-surface text-2xl">{m.mood ? MOODS[m.mood - 1]?.emoji : "🤷"}</span>
              <span>
                <span className="block text-sm font-bold text-vio-900">{m.mood ? MOODS[m.mood - 1]?.label : "Non lo so"}</span>
                <span className="block text-xs text-ink-muted">{formatDateTime(m.created_at, settings.general.timezone)}</span>
                {m.note && <span className="block text-sm text-ink-soft">{m.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
