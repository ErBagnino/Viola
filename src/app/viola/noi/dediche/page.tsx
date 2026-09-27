import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DedicationsList } from "@/features/dedications/dedications-list";
import { getDedications } from "@/server/noi-data";
import { getSettings } from "@/server/settings";
import { randomPhrase } from "@/server/viola-data";
import { pickOne } from "@/utils/random";

export const metadata = { title: "Per te ♡" };

export default async function DedichePage({ searchParams }: PageProps<"/viola/noi/dediche">) {
  const [{ caso }, settings] = await Promise.all([searchParams, getSettings()]);
  const [items, eyebrow] = await Promise.all([getDedications(settings.general.signature), randomPhrase("da_adam", "Da Adam ♡")]);
  return (
    <div>
      <PageHeader title="Per te ♡" subtitle="Cose che ho scritto pensando a te." back="/viola/noi" />
      {items.length ? (
        <DedicationsList items={items} initialOpenId={caso === "1" ? pickOne(items)?.id : null} eyebrow={settings.general.showDaAdam ? eyebrow : ""} />
      ) : (
        <EmptyState title={`${settings.general.adamName} non ha ancora lasciato nulla qui.`} text="Ma sta scrivendo proprio adesso ♡" />
      )}
    </div>
  );
}
