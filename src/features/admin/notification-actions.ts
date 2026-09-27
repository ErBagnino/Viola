"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/server/auth";
import { audit } from "@/server/audit";
import { safeAction, UserError } from "@/server/action-result";
import { getSettings } from "@/server/settings";
import { adminProviders, runChain } from "@/server/notifications";
import { telegramRecentChats } from "@/server/notifications/telegram";
import { parseSettings } from "@/features/settings/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/db/database.types";

export async function sendTestNotification(channel: "telegram" | "webpush" | "chain") {
  return safeAction(async () => {
    const admin = await assertAdmin();
    const settings = await getSettings();
    const providers = adminProviders(settings).filter((p) => channel === "chain" || p.channel === channel);
    const outcome = await runChain(
      providers,
      { kind: "test", title: "♡ Notifica di prova", body: "Se leggi questo, le notifiche funzionano. ♡", path: "/admin/notifiche", urgent: channel !== "chain" },
      [admin.id],
      channel === "chain" ? settings.notifications.mode : "all",
    );
    const service = createAdminClient();
    if (service) {
      await service.from("notification_events").insert(
        outcome.results
          .filter((r) => r.status === "sent" || r.status === "failed")
          .map((r) => ({ kind: "test", channel: r.channel, status: r.status, detail: r.detail ?? null })),
      );
    }
    revalidatePath("/admin/notifiche");
    return { results: outcome.results, delivered: outcome.delivered };
  });
}

export async function findTelegramChats() {
  return safeAction(async () => {
    await assertAdmin();
    const chats = await telegramRecentChats();
    return { chats };
  });
}

export async function selectTelegramChat(chatId: string) {
  return safeAction(async () => {
    const admin = await assertAdmin();
    if (!/^-?\d{1,20}$/.test(chatId)) throw new UserError("Chat ID non valido");
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("value").eq("key", "notifications").maybeSingle();
    const current = parseSettings("notifications", data?.value);
    const next = { ...current, telegramChatId: z.string().parse(chatId) };
    const { error } = await supabase.from("app_settings").upsert({ key: "notifications", value: next as unknown as NonNullable<Json>, is_public: false, updated_by: admin.id }, { onConflict: "key" });
    if (error) throw error;
    await audit({ adminId: admin.id, action: "settings", table: "app_settings", targetId: "notifications", before: current, after: next });
    revalidatePath("/admin/notifiche");
    return {};
  });
}
