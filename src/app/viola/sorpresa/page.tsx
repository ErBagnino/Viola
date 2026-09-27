import { PageHeader } from "@/components/ui/page-header";
import { SurpriseBox } from "@/features/surprise/surprise-box";
import { getSurprises } from "@/server/surprise-data";

export const metadata = { title: "Sorprendimi" };

export default async function SorpresaPage() {
  const items = await getSurprises();
  return (
    <div>
      <PageHeader title="Sorprendimi ♡" subtitle="Non sai cosa uscirà." back="/viola" />
      <SurpriseBox items={items} />
    </div>
  );
}
