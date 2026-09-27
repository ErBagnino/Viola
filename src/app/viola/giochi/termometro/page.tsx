import { PageHeader } from "@/components/ui/page-header";
import { LoveSlider } from "@/features/games/love-slider";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Termometro dell'amore" };

export default async function Page() {
  const { general } = await getSettings();
  return (
    <div>
      <PageHeader title="Termometro dell'amore" back="/viola/giochi" />
      <LoveSlider adamName={general.adamName} />
    </div>
  );
}
