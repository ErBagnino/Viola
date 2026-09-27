import { PageHeader } from "@/components/ui/page-header";
import { MoodPicker } from "@/features/mood/mood-picker";
import { MOODS } from "@/features/content/constants";
import { MoodHistoryDelete } from "@/features/mood/mood-history";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/settings";
import { getViewer } from "@/server/auth";
import { formatDateTime } from "@/utils/dates";

export const metadata = { title: "Come mi sento" };

export default async function UmorePage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("mood_entries").select("*").eq("user_id", viewer!.id).order("created_at", { ascending: false }).limit(30),
    getSettings(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Come ti senti?" subtitle="Nessun giudizio, nessuna diagnosi. Solo un modo per ascoltarti." back="/viola/altro" />
      <MoodPicker title="Adesso mi sento…" />
      {data && data.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 font-sans text-xs font-extrabold tracking-widest text-vio-500 uppercase">Ultimi giorni</h2>
          <ul className="space-y-2">
            {data.map((m) => (
              <li key={m.id} className="paper flex items-center gap-3 rounded-3xl p-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-surface text-2xl">{m.mood ? MOODS[m.mood - 1]?.emoji : "🤷"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-vio-900">{m.mood ? MOODS[m.mood - 1]?.label : "Non lo so"}</span>
                  <span className="block text-xs text-ink-muted">
                    {formatDateTime(m.created_at, settings.general.timezone)} · {m.shared ? "♡ visibile ad Adam" : "🔒 solo tuo"}
                  </span>
                  {m.note && <span className="block text-sm text-ink-soft">{m.note}</span>}
                </span>
                <MoodHistoryDelete id={m.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
