import "server-only";
import type { Content } from "@google/genai";
import type { SettingsMap } from "@/features/settings/schema";

/**
 * Free Gemini API models, best first. Each model has its OWN free quota, so
 * when one is used up the next one still answers. Names that do not exist
 * (any more) for this key are skipped automatically and remembered.
 * Only "flash" families: even on a key with billing enabled they are the
 * cheapest — never "pro".
 */
export const FREE_CHAIN = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

/**
 * Open Gemma models: a much larger free daily quota, but no tools and no
 * system instructions. Last resort, and only for Adam AI (never for the
 * copilot, whose job is running tools).
 */
export const TEXT_ONLY_CHAIN = ["gemma-3-27b-it", "gemma-3-12b-it"];

export const isTextOnlyModel = (model: string) => /^gemma-/i.test(model);

/** The ordered, de-duplicated list of models to try for one request. */
export function modelChain(settings: SettingsMap, configured: string, opts: { textOnly: boolean }) {
  const { ai } = settings;
  const all = [configured || ai.model, ...ai.fallbackModels, ...(ai.autoFreeModels ? [...FREE_CHAIN, ...(opts.textOnly ? TEXT_ONLY_CHAIN : [])] : [])]
    .map((m) => m.trim())
    .filter(Boolean)
    .filter((m) => opts.textOnly || !isTextOnlyModel(m));
  return [...new Set(all)];
}

// ---------------------------------------------------------------------------
// Cooldowns: a model that just said "quota finished" is not asked again until
// its quota is back. In memory (per server instance): a best-effort shortcut,
// never a source of truth — worst case a model is simply tried once more.
// ---------------------------------------------------------------------------

const cooling = new Map<string, { until: number; kind: ModelFailure }>();

/** Milliseconds until the next midnight in California (when Gemini daily free quotas reset). */
export function msUntilQuotaReset(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const elapsed = (get("hour") * 3600 + get("minute") * 60 + get("second")) * 1000;
  return Math.max(60_000, 86_400_000 - elapsed);
}

export type ModelFailure = "missing" | "daily" | "rate" | "busy";

export function cooldownMs(kind: ModelFailure, message = "", now = new Date()) {
  switch (kind) {
    case "missing":
      return 24 * 3600_000;
    case "daily":
      return msUntilQuotaReset(now);
    case "rate": {
      const s = Number(message.match(/retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/i)?.[1] ?? 60);
      return Math.min(120, Math.max(5, s)) * 1000;
    }
    case "busy":
      return 20_000;
  }
}

/** A 429 that names a per-day quota means "come back tomorrow"; any other 429 is a per-minute limit. */
export function failureKind(status: number | undefined, message: string): ModelFailure | null {
  if (status === 404 || /not found|is not supported|unknown model/i.test(message)) return "missing";
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message)) return /PerDay|per day|daily/i.test(message) ? "daily" : "rate";
  if (status === 503 || /UNAVAILABLE|overloaded/i.test(message)) return "busy";
  return null;
}

export function coolDown(model: string, kind: ModelFailure, message = "", now = new Date()) {
  cooling.set(model, { until: now.getTime() + cooldownMs(kind, message, now), kind });
}

export function isCooling(model: string, now = Date.now()) {
  const entry = cooling.get(model);
  if (entry === undefined) return false;
  if (entry.until <= now) {
    cooling.delete(model);
    return false;
  }
  return true;
}

/** Why every model of a request is resting: quota, missing names, or overload. */
export function coolingReason(models: string[]): "limit" | "model_not_found" | "unavailable" {
  const kinds = models.map((m) => cooling.get(m)?.kind).filter(Boolean);
  if (kinds.some((k) => k === "daily" || k === "rate")) return "limit";
  if (kinds.length && kinds.every((k) => k === "missing")) return "model_not_found";
  return "unavailable";
}

/** Test helper. */
export function resetCooldowns() {
  cooling.clear();
}

// ---------------------------------------------------------------------------
// Text-only models (Gemma): no system instructions, no tools, no thinking.
// ---------------------------------------------------------------------------

export const TEXT_ONLY_NOTE =
  "(In questo momento non hai strumenti a disposizione: rispondi solo con il testo e non dire mai di aver aperto, mostrato, salvato o inviato qualcosa.)";

/** Folds the system prompt into the first user turn and keeps only plain text. */
export function textOnlyContents(system: string, contents: Content[]): Content[] {
  const clean: Content[] = contents
    .map((c) => ({ role: c.role, parts: (c.parts ?? []).filter((p) => typeof p.text === "string" && p.text && !p.thought).map((p) => ({ text: p.text })) }))
    .filter((c) => c.parts.length > 0);
  const preface = { text: `${system}\n\n${TEXT_ONLY_NOTE}\n\n---\n\n` };
  if (clean[0]?.role === "user") return [{ role: "user", parts: [preface, ...clean[0].parts!] }, ...clean.slice(1)];
  return [{ role: "user", parts: [preface] }, ...clean];
}
