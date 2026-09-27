import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type Seen = { model: string; system: boolean; tools: number; firstText: string };
const seen: Seen[] = [];
const exhausted = new Set<string>();
let server: http.Server;

beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    const json = body ? JSON.parse(body) : {};
    const model = (req.url ?? "").match(/models\/([^:]+):/)?.[1] ?? "";
    seen.push({ model, system: Boolean(json.systemInstruction), tools: json.tools?.length ?? 0, firstText: json.contents?.[0]?.parts?.[0]?.text ?? "" });
    const fail = (code: number, status: string, message: string, details: unknown[] = []) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code, status, message, details } }));
    };
    if (model === "old-model") return fail(404, "NOT_FOUND", `models/${model} is not found for API version v1beta`);
    if (exhausted.has(model))
      return fail(429, "RESOURCE_EXHAUSTED", "You exceeded your current quota", [
        { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] },
      ]);
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write(`data: ${JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: `ciao da ${model}` }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 } })}\n\n`);
    res.end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_BASE_URL", `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  seen.length = 0;
  exhausted.clear();
  (await import("@/server/ai/models")).resetCooldowns();
});

const round = async (models: string[]) => {
  const { streamRound } = await import("@/server/ai/gemini");
  return streamRound({
    models,
    system: "SISTEMA",
    contents: [{ role: "user", parts: [{ text: "ciao" }] }],
    tools: [{ name: "start_breathing", description: "x" }],
    maxOutputTokens: 100,
    temperature: 0.5,
  });
};

describe("Gemini free-model fallback (real SDK, fake server)", () => {
  it("skips a missing model and a model over its daily quota, and remembers them", async () => {
    exhausted.add("gemini-flash-latest");
    const r = await round(["old-model", "gemini-flash-latest", "gemini-flash-lite-latest"]);
    expect(r.text).toBe("ciao da gemini-flash-lite-latest");
    expect(seen.map((s) => s.model)).toEqual(["old-model", "gemini-flash-latest", "gemini-flash-lite-latest"]);
    // the SDK's error text carries the quota id: a per-day quota rests until the reset, not just a minute
    const { isCooling, msUntilQuotaReset } = await import("@/server/ai/models");
    if (msUntilQuotaReset() > 200_000) expect(isCooling("gemini-flash-latest", Date.now() + 150_000)).toBe(true);

    seen.length = 0;
    const again = await round(["old-model", "gemini-flash-latest", "gemini-flash-lite-latest"]);
    expect(again.text).toBe("ciao da gemini-flash-lite-latest");
    expect(seen.map((s) => s.model)).toEqual(["gemini-flash-lite-latest"]); // no wasted calls
  });

  it("falls back to Gemma as text only: no tools, system prompt folded into the message", async () => {
    exhausted.add("gemini-flash-latest");
    const r = await round(["gemini-flash-latest", "gemma-3-27b-it"]);
    expect(r.text).toBe("ciao da gemma-3-27b-it");
    const g = seen.find((s) => s.model === "gemma-3-27b-it")!;
    expect(g.system).toBe(false);
    expect(g.tools).toBe(0);
    expect(g.firstText).toContain("SISTEMA");
    expect(seen.find((s) => s.model === "gemini-flash-latest")!.tools).toBe(1);
  });

  it("when every free model is used up it says so (Adam AI shows its 'pausa' message) without more calls", async () => {
    for (const m of ["gemini-flash-latest", "gemma-3-27b-it"]) exhausted.add(m);
    await expect(round(["gemini-flash-latest", "gemma-3-27b-it"])).rejects.toMatchObject({ code: "limit" });
    seen.length = 0;
    await expect(round(["gemini-flash-latest", "gemma-3-27b-it"])).rejects.toMatchObject({ code: "limit" });
    expect(seen).toHaveLength(0);
  });
});
