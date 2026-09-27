import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpNow } from "@/features/comfort/help-now";
import { getComfortItems } from "@/server/comfort-data";
import { weightedPick } from "@/utils/random";

export const metadata = { title: "Aiutami adesso" };

export default async function AiutamiPage() {
  const items = await getComfortItems();
  return (
    <div>
      <PageHeader title="Aiutami adesso" subtitle="Una cosa sola. Piccola. Fattibile." back="/viola/calma" />
      {items.length ? <HelpNow items={items} initialId={weightedPick(items)?.id} /> : <EmptyState title="Adam sta preparando le idee" text="Intanto puoi respirare con me." />}
    </div>
  );
}
