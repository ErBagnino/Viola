import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MemoryTimeline } from "@/features/memories/memory-timeline";
import { getMemories } from "@/server/noi-data";
import { getNextCountdown } from "@/server/viola-data";
import { getSettings } from "@/server/settings";
import { countdownParts, occurrenceOf } from "@/utils/dates";
import { pickOne } from "@/utils/random";

export const metadata = { title: "Le nostre cose" };

export default async function RicordiPage({ searchParams }: PageProps<"/viola/noi/ricordi">) {
  const [{ caso }, items, settings] = await Promise.all([searchParams, getMemories(), getSettings()]);
  const tz = settings.general.timezone;
  const next = await getNextCountdown(tz);
  const days = next ? countdownParts(occurrenceOf(next.target_at, next.recurring_yearly, new Date(), tz).at).days : 0;
  const now = {
    nextTitle: next?.title ?? null,
    nextLabel: next ? (next.isToday ? settings.texts.countdownToday : days === 0 ? "tra poche ore" : `tra ${days} ${days === 1 ? "giorno" : "giorni"}`) : null,
  };
  return (
    <div>
      <PageHeader title="Le nostre cose" subtitle="Appuntamenti, viaggi, anniversari, posti." back="/viola/noi" />
      {items.length ? (
        <MemoryTimeline items={items} initialOpenId={caso === "1" ? pickOne(items)?.id : null} now={now} />
      ) : (
        <EmptyState title="La nostra storia sta per essere scritta" text="Stiamo raccogliendo i ricordi più belli ♡" />
      )}
    </div>
  );
}
