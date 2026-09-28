import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SettingsMap } from "@/features/settings/schema";
import { serverEnv } from "@/server/env";
import { createTelegramProvider } from "./telegram";
import type { ChannelResult, NotificationPayload, NotificationProvider } from "./types";
import { webPushProvider } from "./webpush";

export type NotifyOutcome = { delivered: boolean; results: ChannelResult[] };

export function telegramChatId(settings: SettingsMap) {
  return serverEnv.telegramChatId || settings.notifications.telegramChatId;
}

/** Provider chain in priority order: Telegram → Web Push (→ WhatsApp link in the UI). */
export function adminProviders(settings: SettingsMap): NotificationProvider[] {
  return [createTelegramProvider(() => telegramChatId(settings)), webPushProvider];
}

async function adminIds(): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("profiles").select("id").eq("role", "admin");
  return (data ?? []).map((r) => r.id);
}

/**
 * Runs the provider chain. In "fallback" mode it stops at the first channel
 * that delivers; in "all" mode it tries every configured channel. Every
 * outcome is stored in notification_events (even when nothing worked).
 */
export async function runChain(
  providers: NotificationProvider[],
  payload: NotificationPayload,
  userIds: string[],
  mode: "fallback" | "all",
): Promise<NotifyOutcome> {
  const results: ChannelResult[] = [];
  let delivered = false;
  for (const provider of providers) {
    if (delivered && mode === "fallback") break;
    if (!provider.isConfigured()) {
      results.push({ channel: provider.channel, status: "not_configured" });
      continue;
    }
    let r: ChannelResult;
    try {
      r = await provider.send(payload, { userIds });
    } catch (e) {
      r = { channel: provider.channel, status: "failed", detail: e instanceof Error ? e.message.slice(0, 200) : "errore" };
    }
    results.push(r);
    if (r.status === "sent") delivered = true;
  }
  return { delivered, results };
}

async function record(payload: NotificationPayload, outcome: NotifyOutcome) {
  const admin = createAdminClient();
  if (!admin) return;
  const rows = outcome.results
    .filter((r) => r.status === "sent" || r.status === "failed")
    .map((r) => ({
      kind: payload.kind,
      request_id: payload.requestId ?? null,
      message_id: payload.messageId ?? null,
      channel: r.channel,
      status: r.status,
      detail: r.detail ?? null,
    }));
  if (!outcome.delivered) {
    rows.push({
      kind: payload.kind,
      request_id: payload.requestId ?? null,
      message_id: payload.messageId ?? null,
      channel: "none" as never,
      status: "failed",
      detail: "Nessun canale automatico disponibile: mostrato il link WhatsApp.",
    });
  }
  if (rows.length) await admin.from("notification_events").insert(rows);
}

/** Notifies Adam (all admins). Never throws. */
export async function notifyAdmin(payload: NotificationPayload, settings: SettingsMap): Promise<NotifyOutcome> {
  try {
    const outcome = await runChain(adminProviders(settings), payload, await adminIds(), settings.notifications.mode);
    await record(payload, outcome).catch((e) => console.error("[notify] not recorded:", e instanceof Error ? e.message : e));
    return outcome;
  } catch (e) {
    console.error("[notify] admin alert failed:", e instanceof Error ? e.message.slice(0, 200) : e);
    return { delivered: false, results: [] };
  }
}

/** Notifies Viola (Web Push only). Never throws. */
export async function notifyUser(userId: string, payload: NotificationPayload): Promise<NotifyOutcome> {
  try {
    return await runChain([webPushProvider], payload, [userId], "fallback");
  } catch (e) {
    console.error("[notify] push to Viola failed:", e instanceof Error ? e.message.slice(0, 200) : e);
    return { delivered: false, results: [] };
  }
}
