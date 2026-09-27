import "server-only";
import { createViolaClient } from "@/server/viola-view";
import { DEFAULT_54321, parseSteps, type GroundingExercise } from "@/features/grounding/types";

export async function getGroundingExercises(): Promise<GroundingExercise[]> {
  const supabase = await createViolaClient();
  const { data } = await supabase.from("grounding_exercises").select("*").order("position");
  return (data ?? [])
    .map((g) => ({
      slug: g.slug,
      title: g.title,
      description: g.description,
      icon: g.icon,
      steps: parseSteps(g.steps),
      endText: g.end_text || "Sei qui. Va bene così. ♡",
    }))
    .filter((g) => g.steps.length > 0);
}

export async function getGroundingExercise(slug: string): Promise<GroundingExercise | null> {
  const all = await getGroundingExercises();
  const hit = all.find((g) => g.slug === slug);
  if (hit) return hit;
  return slug === "54321" ? DEFAULT_54321 : null;
}
