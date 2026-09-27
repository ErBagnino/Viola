import { PageHeader } from "@/components/ui/page-header";
import { ActionCard } from "@/features/home/action-card";
import { SmileCard } from "@/features/smile/smile-card";
import { getPhrases } from "@/server/viola-data";

export const metadata = { title: "Voglio sorridere" };

export default async function SorridiPage() {
  const phrases = (await getPhrases("smile")).map((p) => p.text);
  return (
    <div className="space-y-5">
      <PageHeader title="Voglio sorridere" subtitle="Una cosa leggera, promesso." back="/viola" />
      {phrases.length > 0 && <SmileCard phrases={phrases} />}
      <div className="grid grid-cols-2 gap-3">
        <ActionCard href="/viola/ai?q=Fammi%20ridere" title="Fammi ridere" subtitle="Chiedilo ad Adam AI" icon="bot-heart" color="wine" />
        <ActionCard href="/viola/noi/dediche?caso=1" title="Una dedica" subtitle="Una a caso" icon="mail-heart" color="blush" />
        <ActionCard href="/viola/giochi/roulette" title="Roulette romantica" subtitle="Gira e vedi" icon="orbit" color="lilac" />
        <ActionCard href="/viola/noi/foto/random" title="Una nostra foto" subtitle="Fammi vedere noi" icon="camera" color="peach" />
      </div>
    </div>
  );
}
