import { PageHeader } from "@/components/ui/page-header";
import { CalmExperience } from "@/features/calm/calm-experience";
import { getSettings } from "@/server/settings";
import { CALM_MODES } from "@/features/calm/modes";
import { pickOne } from "@/utils/random";

export const metadata = { title: "Calmati" };

export default async function CalmatiPage() {
  const { texts, calm } = await getSettings();
  return (
    <div>
      <PageHeader title={texts.calmTitle} subtitle="Scegli una cosa da guardare. Il resto può aspettare." back="/viola/calma" />
      <CalmExperience timers={calm.timers} endText={texts.calmEnd} initialMode={calm.defaultMode === "random" ? (pickOne(CALM_MODES)?.value ?? null) : null} />
    </div>
  );
}
