import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { LiveCountdown } from "@/features/home/live-countdown";
import { createClient } from "@/lib/supabase/server";
import { mediaByIds } from "@/server/media";
import { formatDate, occurrenceOf } from "@/utils/dates";
import { getSettings } from "@/server/settings";
import { COUNTDOWN_LEADS } from "@/features/content/constants";

export const metadata = { title: "Countdown" };

const KIND: Record<string, string> = {
  anniversary: "Anniversario",
  birthday: "Compleanno",
  meeting: "Prossimo incontro",
  trip: "Viaggio",
  event: "Evento",
  custom: "Countdown",
};

export default async function CountdownPage() {
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([supabase.from("countdowns").select("*").order("position"), getSettings()]);
  const { texts, general } = settings;
  const tz = general.timezone;
  const now = new Date();
  // Today's first, then upcoming by date, then the ones already gone.
  const list = (data ?? [])
    .map((c) => ({ ...c, occ: occurrenceOf(c.target_at, c.recurring_yearly, now, tz) }))
    .map((c) => ({ ...c, next: c.occ.at }))
    .sort((a, b) => Number(b.occ.isToday) - Number(a.occ.isToday) || Number(a.occ.past) - Number(b.occ.past) || a.next.getTime() - b.next.getTime());
  const media = await mediaByIds(supabase, list.map((c) => c.media_id));

  return (
    <div>
      <PageHeader title="Manca poco" subtitle="I giorni che contiamo insieme." back="/viola/noi" />
      {list.length === 0 ? (
        <EmptyState title="Nessun countdown ancora" text="Adam sta segnando le date importanti ♡" />
      ) : (
        <div className="space-y-4">
          {list.map((c, i) => {
            const img = c.media_id ? media.get(c.media_id) : null;
            const past = c.occ.past;
            const lead = c.kind === "meeting" ? texts.countdownMeetingLead : (COUNTDOWN_LEADS[c.kind] ?? null);
            return (
              <article key={c.id} className={`relative overflow-hidden rounded-4xl p-5 shadow-soft ${i === 0 ? "bg-gradient-to-br from-wine-600 to-wine-800 text-white" : "paper"}`}>
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
                )}
                <div className="relative">
                  <p className={`flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase ${i === 0 ? "text-white/70" : "text-wine-500"}`}>
                    <Icon name={c.icon ?? "hourglass"} className="size-4 text-base" /> {KIND[c.kind] ?? "Countdown"}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">{c.title}</h2>
                  {c.description && <p className={`text-sm ${i === 0 ? "text-white/75" : "text-ink-soft"}`}>{c.description}</p>}
                  <p className={`mt-1 text-sm font-bold ${i === 0 ? "text-white/80" : "text-wine-600"}`}>{formatDate(c.next, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                  <div className="mt-4">
                    {past ? (
                      <p className="font-hand text-2xl">{texts.countdownDone}</p>
                    ) : (
                      <LiveCountdown target={c.target_at} recurring={c.recurring_yearly} tone={i === 0 ? "dark" : "light"} tz={tz} lead={lead} todayText={texts.countdownToday} />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
