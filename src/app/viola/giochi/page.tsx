import { PageHeader } from "@/components/ui/page-header";
import { ActionCard } from "@/features/home/action-card";
import { APP_ACTIONS } from "@/features/actions/registry";
import { createViolaClient } from "@/server/viola-view";

export const metadata = { title: "Giochi" };

const GAMES = [
  { key: "game_memory", subtitle: "Trova le coppie delle nostre foto", color: "blush" },
  { key: "game_heart", subtitle: "Dove si nasconde?", color: "lilac" },
  { key: "game_puzzle", subtitle: "Rimetti insieme la foto", color: "peach" },
  { key: "game_quiz", subtitle: "Un piccolo quiz su di me", color: "wine" },
  { key: "game_reaction", subtitle: "30 secondi di riflessi", color: "red" },
  { key: "game_slider", subtitle: "Quanto mi vuoi bene?", color: "blush" },
  { key: "game_questions", subtitle: "Domande per conoscerci", color: "cream" },
  { key: "game_roulette", subtitle: "Gira e scopri", color: "lilac" },
  { key: "game_guess", subtitle: "Ti ricordi dov'eravamo?", color: "night" },
] as const;

export default async function GiochiPage() {
  const supabase = await createViolaClient();
  const { count } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true });
  const games = GAMES.filter((g) => g.key !== "game_quiz" || (count ?? 0) > 0);
  return (
    <div>
      <PageHeader title="Giochi" subtitle="Piccoli giochi, solo per noi." back="/viola/altro" />
      <div className="grid grid-cols-2 gap-3">
        {games.map((g, i) => (
          <ActionCard key={g.key} href={APP_ACTIONS[g.key].href} title={APP_ACTIONS[g.key].label} subtitle={g.subtitle} icon={APP_ACTIONS[g.key].icon} color={g.color} index={i} />
        ))}
      </div>
    </div>
  );
}
