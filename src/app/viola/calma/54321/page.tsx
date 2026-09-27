import { PageHeader } from "@/components/ui/page-header";
import { GroundingFlow } from "@/features/grounding/grounding-flow";
import { DEFAULT_54321 } from "@/features/grounding/types";
import { getGroundingExercise } from "@/server/grounding-data";
import { getSettings } from "@/server/settings";

export const metadata = { title: "5-4-3-2-1" };

export default async function Page() {
  const [exercise, settings] = await Promise.all([getGroundingExercise("54321"), getSettings()]);
  const ex = exercise ?? DEFAULT_54321;
  return (
    <div>
      <PageHeader title="5-4-3-2-1" subtitle="Torniamo qui, con i sensi." back="/viola/calma" />
      <GroundingFlow exercise={{ ...ex, endText: ex.endText || settings.texts.groundingEnd }} />
    </div>
  );
}
