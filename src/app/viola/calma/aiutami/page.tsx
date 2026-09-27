import { PageHeader } from "@/components/ui/page-header";
import { HelpNow } from "@/features/comfort/help-now";
import { getComfortItems } from "@/server/comfort-data";
import { weightedPick } from "@/utils/random";

export const metadata = { title: "Aiutami adesso" };

export default async function AiutamiPage() {
  const items = await getComfortItems();
  return (
    <div>
      <PageHeader title="Aiutami adesso" subtitle="Una cosa sola. Piccola. Fattibile." back="/viola/calma" />
      <HelpNow items={items} initialId={weightedPick(items)?.id} />
    </div>
  );
}
