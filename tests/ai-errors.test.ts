import http from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { aiErrorMessage, classifyGemini, parseGeminiError, sanitize, type AiErrorCode } from "@/server/ai/errors";
import { defaultSettings } from "@/features/settings/schema";
import { cleanEnvValue } from "@/server/env";

// Real answers of the Gemini API to an invalid key, captured with the real SDK.
const REAL = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "fixtures/gemini-real-errors.json"), "utf8")) as Record<string, { status: number; message: string }>;
const apiError = (status: number, body: object) => Object.assign(new Error(JSON.stringify(body)), { status, name: "ApiError" });
const google = (code: number, status: string, message: string, reason?: string) =>
  apiError(code, { error: { code, status, message, details: reason ? [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason }] : [] } });
const texts = defaultSettings("texts");

describe("what really went wrong with Gemini", () => {
  it("an invalid key (the real answer of Google, streaming and not) is an invalid key — not «Ops»", () => {
    for (const k of ["invalidKeyStream", "invalidKeyPlain"]) {
      const f = parseGeminiError(Object.assign(new Error(REAL[k].message), { status: REAL[k].status }));
      expect(f.status).toBe(400);
      expect(f.reason).toBe("API_KEY_INVALID");
      expect(f.apiStatus).toBe("INVALID_ARGUMENT");
      expect(f.detail).toBe("API key not valid. Please pass a valid API key.");
      expect(classifyGemini(f)).toBe("invalid_key");
    }
  });

  it("tells every kind of failure apart", () => {
    const cases: [unknown, AiErrorCode][] = [
      [google(401, "UNAUTHENTICATED", "Request had invalid authentication credentials."), "invalid_key"],
      [google(400, "INVALID_ARGUMENT", "API key expired. Please renew the API key.", "API_KEY_INVALID"), "invalid_key"],
      [google(403, "PERMISSION_DENIED", "Generative Language API has not been used in project 123 before or it is disabled.", "SERVICE_DISABLED"), "permission"],
      [google(403, "PERMISSION_DENIED", "Requests from referer <empty> are blocked.", "API_KEY_HTTP_REFERRER_BLOCKED"), "permission"],
      [google(400, "FAILED_PRECONDITION", "User location is not supported for the API use."), "region"],
      [google(429, "RESOURCE_EXHAUSTED", "You exceeded your current quota"), "limit"],
      [google(404, "NOT_FOUND", "models/gemini-pro is not found for API version v1beta"), "model_not_found"],
      [google(400, "INVALID_ARGUMENT", "Invalid JSON payload received. Unknown name \"foo\""), "bad_request"],
      [google(400, "FAILED_PRECONDITION", "Gemini API free tier is not available in your country. Please enable billing on your project"), "billing"],
      [google(503, "UNAVAILABLE", "The model is overloaded. Please try again later."), "unavailable"],
      [google(500, "INTERNAL", "An internal error has occurred."), "unavailable"],
      [Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }), "network"],
      [new TypeError("fetch failed"), "network"],
    ];
    for (const [e, code] of cases) expect(classifyGemini(parseGeminiError(e)), String((e as Error).message).slice(0, 60)).toBe(code);
  });

  it("never lets the key into a message or a log", () => {
    expect(sanitize("url ?key=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456 fail")).not.toMatch(/AIzaSy[A-Z]/);
    expect(sanitize("x-goog-api-key: supersecret")).toBe("x-goog-api-key: ****");
    const f = parseGeminiError(apiError(400, { error: { code: 400, message: "bad key AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456" } }));
    expect(f.detail).not.toContain("AIzaSyABC");
  });

  it("Adam gets the cause and what to do; Viola a gentle sentence without technical words", () => {
    const f = parseGeminiError(Object.assign(new Error(REAL.invalidKeyStream.message), { status: 400 }));
    const adam = aiErrorMessage("invalid_key", "admin", texts, f, "G-abc123");
    expect(adam).toContain("API_KEY_INVALID");
    expect(adam).toContain("GEMINI_API_KEY");
    expect(adam).toContain("Prova Gemini");
    expect(adam).toContain("G-abc123");
    for (const code of ["invalid_key", "permission", "region", "billing", "model_not_found", "bad_request", "network", "unavailable", "timeout", "blocked", "empty"] as AiErrorCode[]) {
      const viola = aiErrorMessage(code, "viola", texts, f);
      expect(viola, code).not.toMatch(/API|GEMINI|Vercel|403|400|404|chiave/i);
      expect(viola, code).not.toBe(texts.errorText); // never the generic «Ops» for a known cause
    }
    expect(aiErrorMessage("limit", "viola", texts)).toBe(texts.aiPause);
    expect(aiErrorMessage("permission", "admin", texts, { status: 403, reason: "SERVICE_DISABLED", detail: "" })).toContain("Generative Language API");
    expect(aiErrorMessage("permission", "admin", texts, { status: 403, reason: "API_KEY_HTTP_REFERRER_BLOCKED", detail: "" })).toContain("referrer");
  });

  it("a key pasted with quotes, spaces or the whole NAME=value line still works", () => {
    expect(cleanEnvValue("GEMINI_API_KEY", '  "AIzaXYZ"\n')).toBe("AIzaXYZ");
    expect(cleanEnvValue("GEMINI_API_KEY", "'AIzaXYZ'")).toBe("AIzaXYZ");
    expect(cleanEnvValue("GEMINI_API_KEY", "GEMINI_API_KEY=AIzaXYZ")).toBe("AIzaXYZ");
    expect(cleanEnvValue("GEMINI_API_KEY", 'GEMINI_API_KEY="AIzaXYZ"')).toBe("AIzaXYZ");
    expect(cleanEnvValue("X", "a\"b")).toBe("a\"b");
    expect(cleanEnvValue("X", undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// The real SDK against a fake Gemini: retries, fallbacks and stops.
// ---------------------------------------------------------------------------
type Plan = (n: number, body: { tools?: unknown[] }) => { status: number; body?: object; hang?: boolean; stream?: object[] };
const plans = new Map<string, Plan>();
const hits: { model: string; tools: number }[] = [];
let server: http.Server;

beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : {};
    const model = (req.url ?? "").match(/models\/([^:]+):/)?.[1] ?? "";
    hits.push({ model, tools: body.tools?.length ?? 0 });
    const n = hits.filter((h) => h.model === model).length;
    const plan = plans.get(model)?.(n, body) ?? { status: 200, stream: [{ candidates: [{ content: { role: "model", parts: [{ text: `ciao da ${model}` }] } }] }] };
    if (plan.hang) return; // never answers
    if (plan.status !== 200) {
      res.writeHead(plan.status, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(plan.body));
    }
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    for (const chunk of plan.stream ?? []) res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    res.end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_BASE_URL", `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  vi.stubEnv("GEMINI_FIRST_CHUNK_MS", "800");
});

afterAll(() => {
  server.closeAllConnections?.();
  server.close();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  hits.length = 0;
  plans.clear();
  (await import("@/server/ai/models")).resetCooldowns();
});

const err = (code: number, status: string, message: string, reason?: string) => ({ status: code, body: { error: { code, status, message, details: reason ? [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason }] : [] } } });
const round = async (models: string[], signal?: AbortSignal) => {
  const { streamRound } = await import("@/server/ai/gemini");
  return streamRound({ models, system: "S", contents: [{ role: "user", parts: [{ text: "ciao" }] }], tools: [{ name: "start_breathing", description: "x" }], maxOutputTokens: 50, temperature: 0.5, signal });
};
const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (e) {
    return (e as { code: string }).code;
  }
};

describe("Gemini requests: retry only what is temporary", () => {
  it("an invalid key stops at once: one request, no other model, precise code", async () => {
    plans.set("a", () => err(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.", "API_KEY_INVALID"));
    expect(await codeOf(round(["a", "b", "c"]))).toBe("invalid_key");
    expect(hits.map((h) => h.model)).toEqual(["a"]);
  });

  it("a disabled API (403) stops at once too", async () => {
    plans.set("a", () => err(403, "PERMISSION_DENIED", "Generative Language API has not been used", "SERVICE_DISABLED"));
    expect(await codeOf(round(["a", "b"]))).toBe("permission");
    expect(hits).toHaveLength(1);
  });

  it("a 503 is retried on the same model after a pause, then it answers", async () => {
    plans.set("a", (n) => (n === 1 ? err(503, "UNAVAILABLE", "The model is overloaded.") : { status: 200, stream: [{ candidates: [{ content: { parts: [{ text: "eccomi" }] } }] }] }));
    const t0 = Date.now();
    const r = await round(["a", "b"]);
    expect(r.text).toBe("eccomi");
    expect(r.model).toBe("a");
    expect(hits.map((h) => h.model)).toEqual(["a", "a"]);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(450); // exponential pause, not a hammer
  });

  it("never more than 2 pauses per request, then the next models, then a precise error", async () => {
    for (const m of ["a", "b", "c"]) plans.set(m, () => err(500, "INTERNAL", "boom"));
    expect(await codeOf(round(["a", "b", "c"]))).toBe("unavailable");
    expect(hits.map((h) => h.model)).toEqual(["a", "a", "a", "b", "c"]);
  });

  it("quota (429) or a missing model (404): straight to the next free model", async () => {
    plans.set("a", () => err(429, "RESOURCE_EXHAUSTED", "Quota exceeded for metric GenerateRequestsPerDayPerProjectPerModel-FreeTier"));
    plans.set("b", () => err(404, "NOT_FOUND", "models/b is not found for API version v1beta"));
    const r = await round(["a", "b", "c"]);
    expect(r.model).toBe("c");
    expect(await codeOf(round(["a", "b"]))).toBe("limit"); // both cooling now
  });

  it("a model that never answers is dropped after the first-chunk timeout", async () => {
    plans.set("a", () => ({ status: 200, hang: true }));
    const r = await round(["a", "b"]);
    expect(r.model).toBe("b");
  });

  it("the whole request has a deadline: a timeout says «timeout», a stop says «stopped»", async () => {
    plans.set("a", () => ({ status: 200, hang: true }));
    vi.stubEnv("GEMINI_FIRST_CHUNK_MS", "5000");
    expect(await codeOf(round(["a"], AbortSignal.timeout(300)))).toBe("timeout");
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 200);
    expect(await codeOf(round(["a"], ctrl.signal))).toBe("stopped");
    vi.stubEnv("GEMINI_FIRST_CHUNK_MS", "800");
  });

  it("a network failure is retried, then reported as network", async () => {
    const { streamRound } = await import("@/server/ai/gemini");
    vi.stubEnv("GEMINI_BASE_URL", "http://127.0.0.1:9");
    const code = await codeOf(streamRound({ models: ["a"], system: "S", contents: [{ role: "user", parts: [{ text: "x" }] }], maxOutputTokens: 10, temperature: 0 }));
    vi.stubEnv("GEMINI_BASE_URL", `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    expect(code).toBe("network");
    // the connection failed, not the model: nothing rests, the next message tries again at once
    const { isCooling } = await import("@/server/ai/models");
    expect(isCooling("a")).toBe(false);
    expect((await round(["a"])).model).toBe("a");
  });

  it("when every model rests, the message says why (quota, missing names, overload) — not always «quota»", async () => {
    const { coolDown, coolingReason } = await import("@/server/ai/models");
    coolDown("x", "missing");
    coolDown("y", "missing");
    expect(coolingReason(["x", "y"])).toBe("model_not_found");
    expect(await codeOf(round(["x", "y"]))).toBe("model_not_found");
    coolDown("z", "busy");
    expect(coolingReason(["z"])).toBe("unavailable");
    coolDown("w", "daily");
    expect(coolingReason(["z", "w"])).toBe("limit");
  });

  it("a safety block is «blocked», an empty answer tries the next model", async () => {
    plans.set("a", () => ({ status: 200, stream: [{ candidates: [{ finishReason: "SAFETY", content: { parts: [] } }] }] }));
    expect(await codeOf(round(["a", "b"]))).toBe("blocked");
    plans.set("a", () => ({ status: 200, stream: [{ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [] } }] }] }));
    expect((await round(["a", "b"])).model).toBe("b");
  });

  it("if Google refuses the tool definitions, the same model answers without tools", async () => {
    plans.set("a", (_n, body) => (body.tools?.length ? err(400, "INVALID_ARGUMENT", "Invalid function declaration: parameters schema") : { status: 200, stream: [{ candidates: [{ content: { parts: [{ text: "senza strumenti" }] } }] }] }));
    const r = await round(["a"]);
    expect(r.text).toBe("senza strumenti");
    expect(hits.map((h) => h.tools)).toEqual([1, 0]);
  });
});
