import { afterEach, describe, expect, it, vi } from "vitest";
import { runChain } from "@/server/notifications";
import { createTelegramProvider, telegramText } from "@/server/notifications/telegram";
import type { NotificationProvider, NotificationPayload } from "@/server/notifications/types";

const payload: NotificationPayload = { kind: "need_adam", title: "♡ VIOLA HA BISOGNO DI TE", body: "Ora: 14:32\nMessaggio: \"Ho bisogno di te.\"", path: "/admin/richieste", urgent: true };

function fake(channel: "telegram" | "webpush", status: "sent" | "failed", configured = true): NotificationProvider & { calls: number } {
  const p = {
    channel,
    calls: 0,
    isConfigured: () => configured,
    send: async () => {
      p.calls++;
      return { channel, status };
    },
  };
  return p;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("notification fallback chain", () => {
  it("stops at Telegram when it works (fallback mode)", async () => {
    const tg = fake("telegram", "sent");
    const wp = fake("webpush", "sent");
    const out = await runChain([tg, wp], payload, ["adam"], "fallback");
    expect(out.delivered).toBe(true);
    expect(wp.calls).toBe(0);
  });

  it("falls back to Web Push when Telegram fails", async () => {
    const tg = fake("telegram", "failed");
    const wp = fake("webpush", "sent");
    const out = await runChain([tg, wp], payload, ["adam"], "fallback");
    expect(out.delivered).toBe(true);
    expect(out.results.map((r) => `${r.channel}:${r.status}`)).toEqual(["telegram:failed", "webpush:sent"]);
  });

  it("skips unconfigured providers and reports nothing delivered", async () => {
    const out = await runChain([fake("telegram", "sent", false), fake("webpush", "failed")], payload, ["adam"], "fallback");
    expect(out.delivered).toBe(false);
    expect(out.results[0].status).toBe("not_configured");
  });

  it("tries every channel in 'all' mode", async () => {
    const tg = fake("telegram", "sent");
    const wp = fake("webpush", "sent");
    await runChain([tg, wp], payload, ["adam"], "all");
    expect(tg.calls + wp.calls).toBe(2);
  });

  it("a provider that throws does not break the chain", async () => {
    const boom: NotificationProvider = { channel: "telegram", isConfigured: () => true, send: async () => { throw new Error("boom"); } };
    const out = await runChain([boom, fake("webpush", "sent")], payload, ["adam"], "fallback");
    expect(out.delivered).toBe(true);
    expect(out.results[0].status).toBe("failed");
  });
});

describe("telegram provider", () => {
  it("escapes HTML in the message", () => {
    expect(telegramText({ ...payload, body: "<b>ciao</b> & te" })).toContain("&lt;b&gt;ciao&lt;/b&gt; &amp; te");
  });

  it("sends to the configured chat with an 'Apri app' button and never leaks the token", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:SECRET");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://vio.example.com");
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(url).toContain("/bot123:SECRET/sendMessage");
      expect(body.chat_id).toBe("42");
      expect(body.reply_markup.inline_keyboard[0][0]).toEqual({ text: "Apri app", url: "https://vio.example.com/admin/richieste" });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const tg = createTelegramProvider(() => "42");
    expect(await tg.send(payload, { userIds: [] })).toEqual({ channel: "telegram", status: "sent" });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connect failed for https://api.telegram.org/bot123:SECRET/sendMessage"); }));
    const failed = await tg.send(payload, { userIds: [] });
    expect(failed.status).toBe("failed");
    expect(failed.detail).not.toContain("SECRET");
  });

  it("reports not_configured without a token or chat id", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    expect(createTelegramProvider(() => "42").isConfigured()).toBe(false);
  });
});
