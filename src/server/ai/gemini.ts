import "server-only";
import { ApiError, GoogleGenAI, type Content, type FunctionDeclaration, type Part } from "@google/genai";
import { serverEnv } from "@/server/env";

export class AiError extends Error {
  constructor(
    public code: "not_configured" | "limit" | "offline" | "blocked" | "error",
    message: string,
  ) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;
function getClient() {
  const apiKey = serverEnv.geminiApiKey;
  if (!apiKey) throw new AiError("not_configured", "GEMINI_API_KEY mancante");
  // GEMINI_BASE_URL is only used by the automated tests (local mock server).
  const baseUrl = process.env.GEMINI_BASE_URL;
  client ??= new GoogleGenAI({ apiKey, ...(baseUrl ? { httpOptions: { baseUrl } } : {}) });
  return client;
}

export function isAiConfigured() {
  return Boolean(serverEnv.geminiApiKey);
}

export type StreamRound = {
  /** raw model parts, kept intact (thought signatures) for the tool loop */
  parts: Part[];
  text: string;
  calls: { id?: string; name: string; args: Record<string, unknown> }[];
  usage: { input: number; output: number };
};

function classify(e: unknown): AiError {
  if (e instanceof AiError) return e;
  const status = e instanceof ApiError ? e.status : (e as { status?: number })?.status;
  const msg = e instanceof Error ? e.message : String(e);
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) return new AiError("limit", "quota esaurita");
  if (status === 400 && /safety|blocked/i.test(msg)) return new AiError("blocked", "contenuto bloccato");
  if (status === 401 || status === 403) return new AiError("error", "chiave API non valida");
  if (!status || status >= 500) return new AiError("offline", "servizio non raggiungibile");
  return new AiError("error", msg.slice(0, 200));
}

const isModelMissing = (e: unknown) => {
  const status = e instanceof ApiError ? e.status : (e as { status?: number })?.status;
  const msg = e instanceof Error ? e.message : "";
  return status === 404 || /not found|is not supported|unknown model/i.test(msg);
};
const isThinkingRejected = (e: unknown) => {
  const status = e instanceof ApiError ? e.status : (e as { status?: number })?.status;
  return status === 400 && /thinking/i.test(e instanceof Error ? e.message : "");
};

/**
 * One streamed model turn. Tries the configured model, then the free
 * fallbacks (only on "model not found"). Never falls back to paid APIs.
 */
export async function streamRound(opts: {
  models: string[];
  system: string;
  contents: Content[];
  tools?: FunctionDeclaration[];
  maxOutputTokens: number;
  temperature: number;
  signal?: AbortSignal;
  onText?: (delta: string) => void;
}): Promise<StreamRound> {
  const ai = getClient();
  let lastError: unknown = null;
  for (const model of opts.models.filter(Boolean)) {
    for (const withThinking of [true, false]) {
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents: opts.contents,
          config: {
            systemInstruction: opts.system,
            maxOutputTokens: opts.maxOutputTokens + (withThinking ? 512 : 0),
            temperature: opts.temperature,
            abortSignal: opts.signal,
            ...(withThinking ? { thinkingConfig: { thinkingBudget: 512 } } : {}),
            ...(opts.tools?.length ? { tools: [{ functionDeclarations: opts.tools }] } : {}),
          },
        });
        const round: StreamRound = { parts: [], text: "", calls: [], usage: { input: 0, output: 0 } };
        for await (const chunk of stream) {
          const parts = chunk.candidates?.[0]?.content?.parts ?? [];
          for (const p of parts) {
            round.parts.push(p);
            if (p.functionCall?.name) {
              round.calls.push({ id: p.functionCall.id, name: p.functionCall.name, args: (p.functionCall.args ?? {}) as Record<string, unknown> });
            } else if (typeof p.text === "string" && !p.thought) {
              round.text += p.text;
              opts.onText?.(p.text);
            }
          }
          if (chunk.usageMetadata) {
            round.usage.input = chunk.usageMetadata.promptTokenCount ?? round.usage.input;
            round.usage.output = (chunk.usageMetadata.candidatesTokenCount ?? 0) + (chunk.usageMetadata.thoughtsTokenCount ?? 0);
          }
        }
        return round;
      } catch (e) {
        if (opts.signal?.aborted) throw new AiError("error", "interrotto");
        lastError = e;
        if (withThinking && isThinkingRejected(e)) continue; // retry the same model without thinking config
        if (isModelMissing(e)) break; // try the next free model
        throw classify(e);
      }
    }
  }
  throw classify(lastError ?? new AiError("error", "nessun modello disponibile"));
}

/** Lists the models this API key can use (admin helper). */
export async function listAvailableModels(): Promise<string[]> {
  const ai = getClient();
  const out: string[] = [];
  const pager = await ai.models.list({ config: { pageSize: 100 } });
  for await (const m of pager) {
    const name = (m.name ?? "").replace(/^models\//, "");
    if (name.includes("gemini") && (m.supportedActions ?? []).includes("generateContent")) out.push(name);
  }
  return out.sort();
}
