import { PageHeader } from "@/components/ui/page-header";
import { ActionCard } from "@/features/home/action-card";
import { HelpNow } from "@/features/comfort/help-now";
import { getComfortItems } from "@/server/comfort-data";
import { APP_ACTIONS } from "@/features/actions/registry";
import { weightedPick } from "@/utils/random";

export const metadata = { title: "Voglio distrarmi" };

const GAMES = ["game_heart", "game_memory", "game_reaction", "game_puzzle", "game_questions", "game_roulette"] as const;
const COLORS = ["blush", "lilac", "peach", "cream", "lilac", "blush"];

export default async function DistraitiPage() {
  const items = (await getComfortItems()).filter((c) => c.category === "distraction" || c.category === "sensory" || c.category === "movement");
  return (
    <div className="space-y-6">
      <PageHeader title="Voglio distrarmi" subtitle="Portiamo la testa da un'altra parte, per un po'." back="/viola" />
      <section>
        <h2 className="mb-3 px-1 font-sans text-xs font-extrabold tracking-widest text-wine-500 uppercase">Un gioco</h2>
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((g, i) => (
            <ActionCard key={g} href={APP_ACTIONS[g].href} title={APP_ACTIONS[g].label} icon={APP_ACTIONS[g].icon} color={COLORS[i]} index={i} />
          ))}
          <ActionCard href="/viola/ai?q=Intrattienimi" title="Intrattienimi" subtitle="Con Adam AI" icon="bot-heart" color="wine" wide />
        </div>
      </section>
      {items.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 font-sans text-xs font-extrabold tracking-widest text-wine-500 uppercase">Oppure prova questo</h2>
          <HelpNow items={items} initialId={weightedPick(items)?.id} />
        </section>
      )}
    </div>
  );
}
