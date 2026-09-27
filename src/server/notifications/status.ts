import "server-only";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import type { SettingsMap } from "@/features/settings/schema";
import { serverEnv } from "@/server/env";
import { getContact } from "@/server/contact";
import { telegramChatId } from "./index";
import { telegramGetMe } from "./telegram";

export type ChannelState = "CONNECTED" | "DISCONNECTED" | "NOT CONFIGURED";
export type ChannelStatus = { state: ChannelState; detail: string };

export async function getNotificationStatus(settings: SettingsMap, adminId: string, opts: { checkTelegram?: boolean } = {}) {
  // Telegram
  let telegram: ChannelStatus;
  const chatId = telegramChatId(settings);
  if (!serverEnv.telegramBotToken) telegram = { state: "NOT CONFIGURED", detail: "Manca TELEGRAM_BOT_TOKEN" };
  else if (!chatId) telegram = { state: "DISCONNECTED", detail: "Manca il chat ID: usa \"Trova il mio chat ID\"" };
  else if (opts.checkTelegram) {
    const me = await telegramGetMe();
    telegram = me.ok ? { state: "CONNECTED", detail: `Bot @${me.username} · chat ${chatId}` } : { state: "DISCONNECTED", detail: `Token non valido: ${me.error}` };
  } else telegram = { state: "CONNECTED", detail: `Chat ${chatId}` };

  // Web Push
  let webpush: ChannelStatus;
  if (!publicEnv.vapidPublicKey || !serverEnv.vapidPrivateKey) webpush = { state: "NOT CONFIGURED", detail: "Mancano le chiavi VAPID" };
  else if (!serverEnv.serviceRoleKey) webpush = { state: "NOT CONFIGURED", detail: "Manca SUPABASE_SERVICE_ROLE_KEY" };
  else {
    const supabase = await createClient();
    const { count } = await supabase.from("notification_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", adminId);
    webpush = count ? { state: "CONNECTED", detail: `${count} dispositivo/i abilitato/i` } : { state: "DISCONNECTED", detail: "Premi \"Abilita notifiche\" su questo telefono" };
  }

  // WhatsApp (link mode — Viola taps to write)
  const contact = getContact(settings);
  const whatsapp: ChannelStatus = contact.whatsappNumber
    ? { state: "CONNECTED", detail: `Link wa.me/${contact.whatsappNumber}` }
    : { state: "NOT CONFIGURED", detail: "Imposta ADMIN_WHATSAPP_NUMBER o il numero nelle impostazioni" };

  return { telegram, webpush, whatsapp };
}
