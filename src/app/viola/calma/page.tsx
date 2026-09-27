import { PageHeader } from "@/components/ui/page-header";
import { ActionCard } from "@/features/home/action-card";

export const metadata = { title: "Calma" };

const ITEMS = [
  { href: "/viola/calma/respira", title: "Respira", subtitle: "Respira con me, un respiro alla volta", icon: "wind", color: "peach" },
  { href: "/viola/calma/calmati", title: "Calmati", subtitle: "Cuore, fiore, onda, stelle…", icon: "flower", color: "lilac" },
  { href: "/viola/calma/grounding", title: "Grounding", subtitle: "Piedi a terra, mani, stanza", icon: "footprints", color: "cream" },
  { href: "/viola/calma/54321", title: "5-4-3-2-1", subtitle: "Un gioco con i sensi", icon: "hand", color: "blush" },
  { href: "/viola/calma/paura", title: "Ho paura", subtitle: "Una cosa alla volta", icon: "shield-heart", color: "wine" },
  { href: "/viola/calma/aiutami", title: "Aiutami adesso", subtitle: "Ti propongo io cosa fare", icon: "sparkles", color: "lilac" },
];

export default function CalmaPage() {
  return (
    <div>
      <PageHeader title="Calma" subtitle="Qui puoi rallentare. Non c'è fretta." />
      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map((it, i) => (
          <ActionCard key={it.href} {...it} index={i} />
        ))}
        <ActionCard href="/viola/adam" title="Ho bisogno di Adam" subtitle="Gli arriva subito un avviso" icon="heart-handshake" color="red" wide />
      </div>
    </div>
  );
}
