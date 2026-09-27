import { afterEach, describe, expect, it } from "vitest";
import { coolDown, cooldownMs, failureKind, FREE_CHAIN, isCooling, modelChain, msUntilQuotaReset, resetCooldowns, TEXT_ONLY_CHAIN, textOnlyContents } from "@/server/ai/models";
import { parseSettings, settingsSchemas, type SettingsMap } from "@/features/settings/schema";

function settings(ai: Record<string, unknown> = {}): SettingsMap {
  const s = Object.fromEntries(Object.keys(settingsSchemas).map((k) => [k, parseSettings(k as keyof SettingsMap, {})])) as SettingsMap;
  return { ...s, ai: parseSettings("ai", ai) };
}

afterEach(() => resetCooldowns());

describe("free model chain", () => {
  it("tries the configured model first, then every free model, Gemma last and only for Adam AI", () => {
    const viola = modelChain(settings(), "", { textOnly: true });
    expect(viola[0]).toBe("gemini-flash-latest");
    expect(viola).toEqual([...new Set(["gemini-flash-latest", "gemini-flash-lite-latest", ...FREE_CHAIN, ...TEXT_ONLY_CHAIN])]);
    expect(viola.slice(-TEXT_ONLY_CHAIN.length)).toEqual(TEXT_ONLY_CHAIN);
    const copilot = modelChain(settings({ fallbackModels: ["gemma-3-27b-it"] }), "", { textOnly: false });
    expect(copilot.some((m) => m.startsWith("gemma"))).toBe(false);
  });

  it("GEMINI_MODEL wins over the saved model; the automatic chain can be switched off", () => {
    expect(modelChain(settings(), "gemini-2.5-flash", { textOnly: true })[0]).toBe("gemini-2.5-flash");
    expect(modelChain(settings({ autoFreeModels: false }), "", { textOnly: true })).toEqual(["gemini-flash-latest", "gemini-flash-lite-latest"]);
  });

  it("never lists paid-only families", () => {
    for (const m of [...FREE_CHAIN, ...TEXT_ONLY_CHAIN]) expect(m).not.toMatch(/pro|ultra|image|tts|live|audio/i);
  });
});

describe("cooldowns", () => {
  it("tells a daily quota from a per-minute limit", () => {
    const daily = '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","details":[{"violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}';
    const minute = '{"error":{"code":429,"details":[{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"17s"}]}}';
    expect(failureKind(429, daily)).toBe("daily");
    expect(failureKind(429, minute)).toBe("rate");
    expect(cooldownMs("rate", minute)).toBe(17_000);
    expect(failureKind(404, "models/x is not found")).toBe("missing");
    expect(failureKind(503, "The model is overloaded")).toBe("busy");
    expect(failureKind(400, "Invalid argument")).toBeNull();
    expect(failureKind(401, "API key not valid")).toBeNull();
  });

  it("a daily quota cools down until midnight in California", () => {
    // 2026-09-27 15:00 in Los Angeles (UTC-7) → 9 hours to midnight
    expect(msUntilQuotaReset(new Date("2026-09-27T22:00:00Z"))).toBe(9 * 3600_000);
    const now = new Date("2026-09-27T22:00:00Z");
    coolDown("gemini-flash-latest", "daily", "", now);
    expect(isCooling("gemini-flash-latest", now.getTime() + 8 * 3600_000)).toBe(true);
    expect(isCooling("gemini-flash-latest", now.getTime() + 9 * 3600_000 + 1)).toBe(false);
    expect(isCooling("gemini-2.5-flash", now.getTime())).toBe(false);
  });
});

describe("text-only models (Gemma)", () => {
  it("fold the system prompt into the first message and drop tool/thought parts", () => {
    const out = textOnlyContents("SISTEMA", [
      { role: "user", parts: [{ text: "ciao" }] },
      { role: "model", parts: [{ text: "pensiero", thought: true }, { functionCall: { name: "start_breathing", args: {} } }] },
      { role: "user", parts: [{ functionResponse: { name: "start_breathing", response: {} } }] },
      { role: "model", parts: [{ text: "Respira con me" }] },
      { role: "user", parts: [{ text: "grazie" }] },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0].role).toBe("user");
    expect(out[0].parts?.[0].text).toContain("SISTEMA");
    expect(out[0].parts?.[0].text).toMatch(/non hai strumenti/);
    expect(out[0].parts?.[1].text).toBe("ciao");
    expect(JSON.stringify(out)).not.toMatch(/functionCall|functionResponse|pensiero/);
  });
});
