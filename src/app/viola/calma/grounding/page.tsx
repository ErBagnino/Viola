import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { getGroundingExercises } from "@/server/grounding-data";
import { DEFAULT_FEET } from "@/features/grounding/types";

export const metadata = { title: "Grounding" };

export default async function GroundingPage() {
  const list = await getGroundingExercises();
  const items = list.length ? list : [DEFAULT_FEET];
  return (
    <div>
      <PageHeader title="Grounding" subtitle="Piccoli esercizi per tornare con i piedi per terra." back="/viola/calma" />
      {items.length === 0 ? (
        <EmptyState title="Nessun esercizio" />
      ) : (
        <div className="grid gap-3">
          {items.map((g) => (
            <Link key={g.slug} href={g.slug === "54321" ? "/viola/calma/54321" : `/viola/calma/grounding/${g.slug}`} className="press paper flex items-center gap-4 rounded-[1.75rem] p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lilac-100 text-lilac-600">
                <Icon name={g.icon ?? "footprints"} className="size-6 text-2xl" />
              </span>
              <span className="min-w-0">
                <span className="block font-extrabold text-wine-900">{g.title}</span>
                {g.description && <span className="block text-sm text-ink-soft">{g.description}</span>}
                <span className="block text-xs font-bold text-wine-500">{g.steps.length} passi</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
