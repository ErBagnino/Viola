import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RandomQuestions } from "@/features/games/questions";
import { getPhrases } from "@/server/viola-data";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";
import { shuffle } from "@/utils/random";

export const metadata = { title: "Domande casuali" };

export default async function Page() {
  const [qs, settings] = await Promise.all([getPhrases("question"), getSettings()]);
  const contact = getContact(settings);
  return (
    <div>
      <PageHeader title="Domande casuali" subtitle="Per conoscerci ancora un po'." back="/viola/giochi" />
      {qs.length ? (
        <RandomQuestions questions={shuffle(qs.map((q) => q.text))} whatsappNumber={contact.whatsappNumber} adamName={settings.general.adamName} />
      ) : (
        <EmptyState title="Nessuna domanda ancora" />
      )}
    </div>
  );
}
