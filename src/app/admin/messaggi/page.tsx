import { AdminHeader } from "@/components/layout/admin-header";
import { Inbox } from "@/features/admin/inbox";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/settings";
import { isAiConfigured } from "@/server/ai/gemini";

export const metadata = { title: "Messaggi" };

export default async function MessaggiPage() {
  const supabase = await createClient();
  const settings = await getSettings();
  const [{ data: msgs }, { data: journal }] = await Promise.all([
    supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(300),
    supabase.from("journal_entries").select("*").eq("visibility", "shared").order("created_at", { ascending: false }).limit(100),
  ]);
  return (
    <div>
      <AdminHeader title="Messaggi" description={`Quello che ${settings.general.violaName} ti ha scritto nell'app e le pagine di diario che ha scelto di condividere.`} icon="mail-heart" />
      <Inbox
        tz={settings.general.timezone}
        aiWriting={settings.writing.enabled && isAiConfigured()}
        violaName={settings.general.violaName}
        messages={(msgs ?? []).map((m) => ({ id: m.id, body: m.body, category: m.category, isPrivate: m.is_private, readAt: m.read_at, reply: m.reply, respondedAt: m.responded_at, createdAt: m.created_at }))}
        journal={(journal ?? []).map((j) => ({ id: j.id, title: j.title, body: j.body, mood: j.mood, createdAt: j.created_at }))}
      />
    </div>
  );
}
