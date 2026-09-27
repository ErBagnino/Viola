import { PageHeader } from "@/components/ui/page-header";
import { ReactionGame } from "@/features/games/reaction";

export const metadata = { title: "Acchiappa i cuori" };

export default function Page() {
  return (
    <div>
      <PageHeader title="Acchiappa i cuori" back="/viola/giochi" />
      <ReactionGame />
    </div>
  );
}
