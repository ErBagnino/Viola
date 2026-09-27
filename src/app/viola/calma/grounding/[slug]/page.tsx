import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { GroundingFlow } from "@/features/grounding/grounding-flow";
import { DEFAULT_FEET } from "@/features/grounding/types";
import { getGroundingExercise } from "@/server/grounding-data";

export default async function Page({ params }: PageProps<"/viola/calma/grounding/[slug]">) {
  const { slug } = await params;
  const exercise = (await getGroundingExercise(slug)) ?? (slug === DEFAULT_FEET.slug ? DEFAULT_FEET : null);
  if (!exercise) notFound();
  return (
    <div>
      <PageHeader title={exercise.title} subtitle={exercise.description ?? undefined} back="/viola/calma/grounding" />
      <GroundingFlow exercise={exercise} doneHref="/viola/calma/grounding" />
    </div>
  );
}
