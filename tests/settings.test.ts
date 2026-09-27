import { describe, expect, it } from "vitest";
import { defaultSettings, parseSettings, settingsSchemas } from "@/features/settings/schema";

describe("settings", () => {
  it("fills every group with defaults when the table is empty", () => {
    for (const key of Object.keys(settingsSchemas) as (keyof typeof settingsSchemas)[]) {
      expect(() => defaultSettings(key)).not.toThrow();
    }
    expect(defaultSettings("general").appName).toBe("Vio ♡");
    expect(defaultSettings("general").loginTitle).toBe("Benvenuta nella nostra piccola casa.");
    expect(defaultSettings("ai").model).toBe("gemini-flash-latest");
  });

  it("drops only the invalid fields of a stored value", () => {
    const parsed = parseSettings("general", { appName: "Nostra casa", shortName: 42, homeGreeting: "ciao amore" });
    expect(parsed.appName).toBe("Nostra casa");
    expect(parsed.homeGreeting).toBe("ciao amore");
    expect(parsed.shortName).toBe("Vio ♡");
  });

  it("rejects malformed phone numbers and chat ids", () => {
    expect(settingsSchemas.contact.safeParse({ whatsappNumber: "<script>" }).success).toBe(false);
    expect(settingsSchemas.notifications.safeParse({ telegramChatId: "abc" }).success).toBe(false);
    expect(settingsSchemas.notifications.safeParse({ telegramChatId: "-100123" }).success).toBe(true);
  });

  it("keeps the AI free-tier guard rails bounded", () => {
    expect(settingsSchemas.ai.safeParse({ maxOutputTokens: 1_000_000 }).success).toBe(false);
    expect(settingsSchemas.ai.safeParse({ dailyMessageLimit: -1 }).success).toBe(false);
  });
});

describe("validation messages", () => {
  it("are in plain Italian", async () => {
    const { settingsSchemas } = await import("@/features/settings/schema");
    const r = settingsSchemas.general.safeParse({ shortName: "Un nome davvero troppo lungo" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe("massimo 14 caratteri");
    const a = settingsSchemas.ai.safeParse({ defaultMode: "" });
    expect(a.error!.issues[0].message).toBe("scegli una delle opzioni");
    const n = settingsSchemas.notifications.safeParse({ telegramChatId: "abc" });
    expect(n.error!.issues[0].message).toBe("Il chat ID è un numero");
  });
});
