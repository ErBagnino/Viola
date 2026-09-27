import { PageHeader } from "@/components/ui/page-header";
import { BreathingExperience } from "@/features/breathing/breathing-experience";
import { getBreathingData } from "@/server/breathing-data";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Respira" };

export default async function RespiraPage({ searchParams }: PageProps<"/viola/calma/respira">) {
  const [{ presets, photos, phrases }, settings, sp] = await Promise.all([getBreathingData(), getSettings(), searchParams]);
  return (
    <div>
      <PageHeader title="Respira con me" subtitle="Scegli un ritmo. Io conto per te." back="/viola/calma" />
      <BreathingExperience presets={presets} photos={photos} phrases={phrases} endText={settings.texts.breathingEnd} autoStart={sp.via === "1"} />
    </div>
  );
}
