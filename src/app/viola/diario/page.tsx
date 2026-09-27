import { PageHeader } from "@/components/ui/page-header";
import { Journal } from "@/features/journal/journal";
import { createViolaClient } from "@/server/viola-view";
import { getSettings } from "@/server/settings";
import { getViewer } from "@/server/auth";

export const metadata = { title: "Diario" };

export default async function DiarioPage() {
  const viewer = await getViewer();
  const supabase = await createViolaClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("journal_entries").select("*").eq("user_id", viewer!.id).order("created_at", { ascending: false }).limit(200),
    getSettings(),
  ]);
  const entries = (data ?? []).map((e) => ({ id: e.id, title: e.title, body: e.body, mood: e.mood, visibility: e.visibility as "private" | "shared", createdAt: e.created_at }));
  return (
    <div>
      <PageHeader title="Dimmi tutto." subtitle="Il tuo diario. Privato, a meno che tu non voglia condividerlo." back="/viola/altro" />
      <Journal entries={entries} adamName={settings.general.adamName} tz={settings.general.timezone} />
    </div>
  );
}
