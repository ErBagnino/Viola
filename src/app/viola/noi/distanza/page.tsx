import { PageHeader } from "@/components/ui/page-header";
import { DistanceMap } from "@/features/distance/distance-map";
import { LiveCountdown } from "@/features/home/live-countdown";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/settings";
import { formatDate, haversineKm } from "@/utils/dates";

export const metadata = { title: "Distanza" };

export default async function DistanzaPage() {
  const { distance: d } = await getSettings();
  const supabase = await createClient();
  const km = Math.round(haversineKm(d.fromLat, d.fromLng, d.toLat, d.toLng));

  let meeting = null;
  if (d.countdownId) {
    meeting = (await supabase.from("countdowns").select("*").eq("id", d.countdownId).maybeSingle()).data;
  }
  if (!meeting) {
    const { data } = await supabase.from("countdowns").select("*").eq("kind", "meeting").gte("target_at", new Date().toISOString()).order("target_at").limit(1);
    meeting = data?.[0] ?? null;
  }

  return (
    <div className="space-y-5">
      <PageHeader title={`${d.fromName} ↔ ${d.toName}`} subtitle={d.note} back="/viola/noi" />
      <DistanceMap from={d.fromName} to={d.toName} km={km} fromLabel={d.fromLabel} toLabel={d.toLabel} />
      {meeting ? (
        <section className="rounded-4xl bg-gradient-to-br from-wine-600 to-wine-800 p-5 text-white shadow-soft">
          <p className="text-xs font-extrabold tracking-widest text-white/70 uppercase">Prossimo incontro</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{meeting.title}</h2>
          <p className="text-sm text-white/75">{formatDate(meeting.target_at, { weekday: "long", day: "numeric", month: "long" })}</p>
          <div className="mt-4">
            <LiveCountdown target={meeting.target_at} tone="dark" />
          </div>
        </section>
      ) : (
        <p className="paper rounded-4xl p-5 text-center text-ink-soft">La data del prossimo incontro arriverà presto ♡</p>
      )}
    </div>
  );
}
