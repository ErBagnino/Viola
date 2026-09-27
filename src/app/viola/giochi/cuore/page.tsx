import { PageHeader } from "@/components/ui/page-header";
import { FindHeart } from "@/features/games/find-heart";
import { newSeed } from "@/utils/random";

export const metadata = { title: "Trova il cuore" };

export default function Page() {
  // new layout on every visit
  return (
    <div>
      <PageHeader title="Trova il cuore" subtitle="Tocca le caselle: dietro una c'è il cuore." back="/viola/giochi" />
      <FindHeart seed={newSeed()} />
    </div>
  );
}
