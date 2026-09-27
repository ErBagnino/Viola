import { AdminHeader } from "@/components/layout/admin-header";
import { RequestsList } from "@/features/admin/requests-list";
import { PushToggle } from "@/features/push/push-toggle";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Ho bisogno di Adam" };

export default async function RichiestePage() {
  const supabase = await createClient();
  const settings = await getSettings();
  const [{ data: reqs }, { data: events }] = await Promise.all([
    supabase.from("adam_requests").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("notification_events").select("*").not("request_id", "is", null).order("created_at").limit(500),
  ]);
  const items = (reqs ?? []).map((r) => ({
    id: r.id,
    message: r.message,
    status: r.status,
    response: r.response,
    createdAt: r.created_at,
    notified: r.notified_channels,
    ok: r.notification_ok,
    events: (events ?? []).filter((e) => e.request_id === r.id).map((e) => ({ channel: e.channel, status: e.status, detail: e.detail })),
  }));
  return (
    <div className="space-y-5">
      <AdminHeader title="HO BISOGNO DI ADAM" description={`Le richieste di ${settings.general.violaName}, con ora, messaggio e canali di notifica.`} icon="heart-handshake" />
      <div className="paper rounded-4xl p-4">
        <PushToggle label="Ricevi le notifiche su questo dispositivo" />
      </div>
      <RequestsList items={items} tz={settings.general.timezone} violaName={settings.general.violaName} />
    </div>
  );
}
