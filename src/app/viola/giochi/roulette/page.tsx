import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Roulette } from "@/features/games/roulette";
import { getPhrases } from "@/server/viola-data";
import { shuffle } from "@/utils/random";

export const metadata = { title: "Roulette romantica" };

export default async function Page() {
  const items = shuffle((await getPhrases("roulette")).map((p) => p.text)).slice(0, 8);
  return (
    <div>
      <PageHeader title="Roulette romantica" subtitle="Gira e fai quello che esce ♡" back="/viola/giochi" />
      {items.length >= 2 ? <Roulette items={items} /> : <EmptyState title="La ruota è vuota" text="Adam deve ancora riempirla ♡" />}
    </div>
  );
}
