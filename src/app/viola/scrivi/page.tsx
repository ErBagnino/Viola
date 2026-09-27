import { PageHeader } from "@/components/ui/page-header";
import { MessageComposer } from "@/features/messages/composer";
import { createViolaClient } from "@/server/viola-view";
import { getSettings } from "@/server/settings";
import { getViewer } from "@/server/auth";

export const metadata = { title: "Scrivi ad Adam" };

export default async function ScriviPage() {
  const viewer = await getViewer();
  const supabase = await createViolaClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("messages").select("*").eq("sender_id", viewer!.id).order("created_at", { ascending: false }).limit(50),
    getSettings(),
  ]);
  const history = (data ?? []).map((m) => ({ id: m.id, body: m.body, category: m.category, isPrivate: m.is_private, createdAt: m.created_at, readAt: m.read_at, reply: m.reply }));
  return (
    <div>
      <PageHeader title={`Scrivi ad ${settings.general.adamName}`} subtitle="Non serve che abbia senso. Scrivi e basta." back="/viola/altro" />
      <MessageComposer history={history} adamName={settings.general.adamName} tz={settings.general.timezone} />
    </div>
  );
}
