import { AdminHeader } from "@/components/layout/admin-header";
import { MediaLibrary, type LibraryItem } from "@/features/admin/media-library";
import { LIBRARY_LIMIT } from "@/features/admin/media-batch";
import { createClient } from "@/lib/supabase/server";
import { signMedia } from "@/server/media";
import { getMediaUsage } from "@/server/media-usage";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Foto e audio" };

export default async function FotoAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("media").select("*").order("created_at", { ascending: false }).limit(LIBRARY_LIMIT);
  const rows = data ?? [];
  const settings = await getSettings();
  const [signedList, usage] = await Promise.all([signMedia(supabase, rows), getMediaUsage(supabase, settings, rows)]);
  const signed = new Map(signedList.map((m) => [m.id, m]));
  const items = rows
    .filter((r) => signed.has(r.id))
    .map((r) => ({ ...r, url: signed.get(r.id)!.url, thumbUrl: signed.get(r.id)!.thumbUrl }) as LibraryItem);
  const categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean) as string[]));
  return (
    <div>
      <AdminHeader title="Foto e audio" description="Carica più foto insieme (vengono ottimizzate e ripulite dai dati GPS), scegli dove compaiono, modifica titoli e didascalie." icon="images" />
      <MediaLibrary items={items} categories={categories} usage={usage} violaName={settings.general.violaName} />
    </div>
  );
}
