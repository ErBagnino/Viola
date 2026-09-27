import "server-only";
import { serverEnv } from "@/server/env";
import type { ChannelResult, NotificationPayload, NotificationProvider } from "./types";

const API = "https://api.telegram.org";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Never let the bot token leak into logs / the database. */
function scrub(s: string) {
  const t = serverEnv.telegramBotToken;
  return (t ? s.split(t).join("***") : s).slice(0, 300);
}

export function telegramText(p: NotificationPayload) {
  return `<b>${escapeHtml(p.title)}</b>\n${escapeHtml(p.body)}`;
}

export function createTelegramProvider(getChatId: () => string): NotificationProvider {
  return {
    channel: "telegram",
    isConfigured: () => Boolean(serverEnv.telegramBotToken && getChatId()),
    async send(p): Promise<ChannelResult> {
      const token = serverEnv.telegramBotToken;
      const chatId = getChatId();
      if (!token || !chatId) return { channel: "telegram", status: "not_configured" };
      const site = serverEnv.siteUrl;
      const url = site ? `${site}${p.path}` : "";
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text: telegramText(p),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      };
      // Telegram only accepts public https URLs for buttons.
      if (url.startsWith("https://")) {
        body.reply_markup = { inline_keyboard: [[{ text: "Apri app", url }]] };
      }
      // Urgent alerts ("Ho bisogno di Adam") get ONE more try on a temporary
      // failure (network, rate limit, Telegram hiccup): a rare duplicate is
      // better than a missed call for help. Never more than two attempts.
      const attempts = p.urgent ? 2 : 1;
      let last: ChannelResult = { channel: "telegram", status: "failed", detail: "errore" };
      for (let attempt = 1; attempt <= attempts; attempt++) {
        let retryAfterMs = 700;
        try {
          const res = await fetch(`${API}/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(8000),
          });
          const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; parameters?: { retry_after?: number } };
          if (res.ok && json.ok) return { channel: "telegram", status: "sent" };
          last = { channel: "telegram", status: "failed", detail: scrub(json.description ?? `HTTP ${res.status}`) };
          const transient = res.status === 429 || res.status >= 500;
          if (!transient) return last; // wrong token / chat id: retrying cannot help
          retryAfterMs = Math.min(3000, (json.parameters?.retry_after ?? 0) * 1000 || 700);
        } catch (e) {
          last = { channel: "telegram", status: "failed", detail: scrub(e instanceof Error ? e.message : "errore di rete") };
        }
        if (attempt < attempts) await new Promise((r) => setTimeout(r, retryAfterMs));
      }
      return last;
    },
  };
}

/** Bot info — used by the admin notification center to show CONNECTED. */
export async function telegramGetMe(): Promise<{ ok: boolean; username?: string; error?: string }> {
  const token = serverEnv.telegramBotToken;
  if (!token) return { ok: false, error: "not_configured" };
  try {
    const res = await fetch(`${API}/bot${token}/getMe`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    const json = (await res.json()) as { ok?: boolean; result?: { username?: string }; description?: string };
    return json.ok ? { ok: true, username: json.result?.username } : { ok: false, error: scrub(json.description ?? "errore") };
  } catch (e) {
    return { ok: false, error: scrub(e instanceof Error ? e.message : "errore di rete") };
  }
}

/** Lists chats that recently wrote to the bot (to discover the chat ID). */
export async function telegramRecentChats(): Promise<{ id: string; name: string }[]> {
  const token = serverEnv.telegramBotToken;
  if (!token) return [];
  const res = await fetch(`${API}/bot${token}/getUpdates?limit=50`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  const json = (await res.json()) as {
    ok?: boolean;
    result?: { message?: { chat?: { id: number; first_name?: string; last_name?: string; username?: string; title?: string } } }[];
  };
  const chats = new Map<string, string>();
  for (const u of json.result ?? []) {
    const c = u.message?.chat;
    if (!c) continue;
    const name = c.title ?? [c.first_name, c.last_name].filter(Boolean).join(" ") ?? c.username ?? String(c.id);
    chats.set(String(c.id), c.username ? `${name} (@${c.username})` : name);
  }
  return [...chats].map(([id, name]) => ({ id, name }));
}
