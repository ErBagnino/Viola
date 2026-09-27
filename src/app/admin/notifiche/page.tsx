import { AdminHeader } from "@/components/layout/admin-header";
import { ChannelCards, TelegramChatFinder } from "@/features/admin/notification-center";
import { PushToggle } from "@/features/push/push-toggle";
import { SettingsForm } from "@/features/settings/settings-form";
import { SETTINGS_FORMS } from "@/features/settings/fields";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { serverEnv } from "@/server/env";
import { getNotificationStatus } from "@/server/notifications/status";
import { formatDateTime } from "@/utils/dates";

export const metadata = { title: "Notifiche" };

export default async function NotifichePage() {
  const admin = await requireAdmin();
  const settings = await getSettings();
  const status = await getNotificationStatus(settings, admin.id, { checkTelegram: true });
  const supabase = await createClient();
  const { data: events } = await supabase.from("notification_events").select("*").order("created_at", { ascending: false }).limit(30);
  const form = SETTINGS_FORMS.notifications!;
  return (
    <div className="space-y-6">
      <AdminHeader title="Notification Center" description="Priorità: Telegram → Web Push → WhatsApp. Tutto gratuito." icon="bell" />
      <ChannelCards status={status} />
      <section className="paper rounded-4xl p-5">
        <h2 className="font-display text-lg font-semibold text-vio-900">Web Push su questo dispositivo</h2>
        <p className="mb-3 text-sm text-ink-soft">Su iPhone: prima aggiungi l&apos;app alla schermata Home, aprila da lì e poi abilita.</p>
        <PushToggle label="Abilita notifiche" />
      </section>
      <section className="paper rounded-4xl p-5">
        <h2 className="mb-2 font-display text-lg font-semibold text-vio-900">Collega Telegram</h2>
        <TelegramChatFinder hasToken={Boolean(serverEnv.telegramBotToken)} />
      </section>
      <SettingsForm settingsKey="notifications" title={form.title} description={form.description} fields={form.fields} initial={settings.notifications} />
      <section className="paper rounded-4xl p-5">
        <h2 className="mb-3 font-display text-lg font-semibold text-vio-900">Ultimi invii</h2>
        {(events ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">Nessun invio ancora.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {events!.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface/70 px-3 py-2">
                <span className="text-ink-muted">{formatDateTime(e.created_at, settings.general.timezone)}</span>
                <b className="text-vio-900">{e.kind}</b>
                <span>{e.channel}</span>
                <span className={e.status === "sent" ? "font-bold text-green-700" : "font-bold text-rouge-600"}>{e.status}</span>
                {e.detail && <span className="text-xs text-ink-muted">{e.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
