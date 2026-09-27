import "server-only";
import webpush from "web-push";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/server/env";
import type { ChannelResult, NotificationPayload, NotificationProvider } from "./types";

let configured = false;
function ensureVapid() {
  if (configured) return true;
  if (!publicEnv.vapidPublicKey || !serverEnv.vapidPrivateKey) return false;
  webpush.setVapidDetails(serverEnv.vapidSubject, publicEnv.vapidPublicKey, serverEnv.vapidPrivateKey);
  configured = true;
  return true;
}

export function isWebPushConfigured() {
  return Boolean(publicEnv.vapidPublicKey && serverEnv.vapidPrivateKey && serverEnv.serviceRoleKey);
}

export const webPushProvider: NotificationProvider = {
  channel: "webpush",
  isConfigured: isWebPushConfigured,
  async send(p: NotificationPayload, target): Promise<ChannelResult> {
    const admin = createAdminClient();
    if (!ensureVapid() || !admin) return { channel: "webpush", status: "not_configured" };
    if (!target.userIds.length) return { channel: "webpush", status: "failed", detail: "nessun destinatario" };

    const { data: subs } = await admin
      .from("notification_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", target.userIds);
    if (!subs?.length) return { channel: "webpush", status: "failed", detail: "nessun dispositivo abilitato" };

    const payload = JSON.stringify({ title: p.title, body: p.body, url: p.path, tag: p.kind, urgent: p.urgent });
    let ok = 0;
    const errors: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            TTL: 60 * 60 * 6,
            urgency: p.urgent ? "high" : "normal",
            timeout: 8000,
          });
          ok++;
          await admin.from("notification_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await admin.from("notification_subscriptions").delete().eq("id", s.id);
            errors.push("dispositivo scaduto (rimosso)");
          } else {
            errors.push(status ? `HTTP ${status}` : "errore di rete");
          }
        }
      }),
    );
    return ok > 0
      ? { channel: "webpush", status: "sent", detail: `${ok}/${subs.length} dispositivi` }
      : { channel: "webpush", status: "failed", detail: errors.join(", ").slice(0, 300) };
  },
};
