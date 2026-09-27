import { AdminHeader } from "@/components/layout/admin-header";
import { MediaLibrary, type LibraryItem } from "@/features/admin/media-library";
import { createClient } from "@/lib/supabase/server";
import { signMedia } from "@/server/media";

export const metadata = { title: "Foto e audio" };

export default async function FotoAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("media").select("*").order("created_at", { ascending: false }).limit(1000);
  const rows = data ?? [];
  const signed = new Map((await signMedia(supabase, rows)).map((m) => [m.id, m]));
  const items = rows
    .filter((r) => signed.has(r.id))
    .map((r) => ({ ...r, url: signed.get(r.id)!.url, thumbUrl: signed.get(r.id)!.thumbUrl }) as LibraryItem);
  const categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean) as string[]));
  return (
    <div>
      <AdminHeader title="Foto e audio" description="Carica più foto insieme (vengono ottimizzate e ripulite dai dati GPS), scegli dove compaiono, modifica titoli e didascalie." icon="images" />
      <MediaLibrary items={items} categories={categories} />
    </div>
  );
}
