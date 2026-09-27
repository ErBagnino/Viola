import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MemoryTimeline } from "@/features/memories/memory-timeline";
import { getMemories } from "@/server/noi-data";
import { pickOne } from "@/utils/random";

export const metadata = { title: "Le nostre cose" };

export default async function RicordiPage({ searchParams }: PageProps<"/viola/noi/ricordi">) {
  const [{ caso }, items] = await Promise.all([searchParams, getMemories()]);
  return (
    <div>
      <PageHeader title="Le nostre cose" subtitle="Appuntamenti, viaggi, anniversari, posti." back="/viola/noi" />
      {items.length ? (
        <MemoryTimeline items={items} initialOpenId={caso === "1" ? pickOne(items)?.id : null} />
      ) : (
        <EmptyState title="La nostra storia sta per essere scritta" text="Adam sta raccogliendo i ricordi più belli ♡" />
      )}
    </div>
  );
}
