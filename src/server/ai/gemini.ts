import "server-only";
import { GoogleGenAI, type Content, type FunctionDeclaration, type Part } from "@google/genai";
import { serverEnv } from "@/server/env";
import { coolDown, coolingReason, failureKind, isCooling, isTextOnlyModel, textOnlyContents } from "./models";
import { classifyGemini, isFatalForChain, isTransient, logGeminiFailure, newErrorRef, parseGeminiError, type AiErrorCode, type GeminiFailure } from "./errors";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
    /** what Google answered, when it did */
    public failure?: GeminiFailure,
    /** short reference, also written in the server log */
    public ref?: string,
  ) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;
let clientKey = "";
function getClient() {
  const apiKey = serverEnv.geminiApiKey;
  if (!apiKey) throw new AiError("not_configured", "GEMINI_API_KEY mancante");
  // GEMINI_BASE_URL is only used by the automated tests (local mock server).
  const baseUrl = process.env.GEMINI_BASE_URL;
  if (!client || clientKey !== `${apiKey}|${baseUrl ?? ""}`) {
    client = new GoogleGenAI({ apiKey, ...(baseUrl ? { httpOptions: { baseUrl } } : {}) });
    clientKey = `${apiKey}|${baseUrl ?? ""}`;
  }
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
  /** the model that answered */
  model: string;
};

/** Any error → AiError with its precise code (see errors.ts). */
export function toAiError(e: unknown, opts: { signal?: AbortSignal; ref?: string } = {}): AiError {
  if (e instanceof AiError) return e;
  if (opts.signal?.aborted) {
    const reason = opts.signal.reason as { name?: string } | undefined;
    return reason?.name === "TimeoutError" ? new AiError("timeout", "tempo scaduto", undefined, opts.ref) : new AiError("stopped", "interrotto", undefined, opts.ref);
  }
  const f = parseGeminiError(e);
  return new AiError(classifyGemini(f), f.detail, f, opts.ref);
}

const isThinkingRejected = (f: GeminiFailure) => f.status === 400 && /thinking/i.test(f.detail);
const isToolsRejected = (f: GeminiFailure) => f.status === 400 && /function|tool|parameters|schema/i.test(f.detail);
const BLOCK_REASONS = /SAFETY|PROHIBITED|BLOCKLIST|SPII|IMAGE_SAFETY/;

/** Transient failures: a short pause (0.5 s, then 1.5 s), then the same model again — at most this many times per request. */
const MAX_RETRIES = 2;
/** A model that sends nothing for this long is treated as overloaded: next model. */
const FIRST_CHUNK_MS = 20_000;

function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    const onAbort = () => (clearTimeout(t), resolve());
    const t = setTimeout(() => (signal?.removeEventListener("abort", onAbort), resolve()), ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * One streamed model turn. Tries the models in order (see models.ts):
 * - a model that is missing, over its free quota or overloaded "cools down"
 *   and the next free one is tried (never paid APIs);
 * - a transient failure (5xx, network) is retried on the same model with an
 *   exponential pause, at most MAX_RETRIES times;
 * - a failure that every model would repeat (invalid key, permissions,
 *   region, billing) stops at once with its precise code;
 * - nothing is retried once text has reached the user (no doubled answers).
 * Every failure is logged with status, reason and model — never the key.
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
  /** reference written in the logs (and shown to Adam) */
  ref?: string;
}): Promise<StreamRound> {
  const ref = opts.ref ?? newErrorRef();
  const ai = getClient();
  let last: AiError | null = null;
  // pauses for transient failures, shared by the whole round (Google fully down ≠ 20 s of waiting)
  let retriesLeft = MAX_RETRIES;
  const models = [...new Set(opts.models.filter(Boolean))];
  const ready = models.filter((m) => !isCooling(m));
  if (models.length && !ready.length) {
    const code = coolingReason(models);
    throw new AiError(code, code === "limit" ? "quota esaurita su tutti i modelli gratuiti" : "tutti i modelli sono a riposo", undefined, ref);
  }

  for (const model of ready) {
    const textOnly = isTextOnlyModel(model);
    let withThinking = !textOnly;
    let withTools = Boolean(opts.tools?.length) && !textOnly;
    let attempt = 0;
    for (;;) {
      attempt++;
      const round: StreamRound = { parts: [], text: "", calls: [], usage: { input: 0, output: 0 }, model };
      // per-attempt abort: the caller's signal, or no first chunk in time
      const attemptCtrl = new AbortController();
      const onParentAbort = () => attemptCtrl.abort(opts.signal?.reason);
      opts.signal?.addEventListener("abort", onParentAbort, { once: true });
      let firstChunk = false;
      const firstChunkMs = Number(process.env.GEMINI_FIRST_CHUNK_MS) || FIRST_CHUNK_MS; // env: tests only
      const firstChunkTimer = setTimeout(() => !firstChunk && attemptCtrl.abort(new DOMException("no first chunk", "FirstChunkTimeout")), firstChunkMs);
      let finishReason = "";
      let blockReason = "";
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents: textOnly ? textOnlyContents(opts.system, opts.contents) : opts.contents,
          config: {
            ...(textOnly ? {} : { systemInstruction: opts.system }),
            maxOutputTokens: opts.maxOutputTokens + (withThinking ? 512 : 0),
            temperature: opts.temperature,
            abortSignal: attemptCtrl.signal,
            ...(withThinking ? { thinkingConfig: { thinkingBudget: 512 } } : {}),
            ...(withTools ? { tools: [{ functionDeclarations: opts.tools! }] } : {}),
          },
        });
        for await (const chunk of stream) {
          firstChunk = true;
          const cand = chunk.candidates?.[0];
          if (cand?.finishReason) finishReason = String(cand.finishReason);
          if (chunk.promptFeedback?.blockReason) blockReason = String(chunk.promptFeedback.blockReason);
          for (const p of cand?.content?.parts ?? []) {
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
        if (!round.text.trim() && !round.calls.length) {
          if (blockReason || BLOCK_REASONS.test(finishReason)) {
            const f = { detail: `blocco: ${blockReason || finishReason}` };
            logGeminiFailure({ ref, model, attempt, code: "blocked", f, final: true });
            throw new AiError("blocked", "risposta bloccata dai filtri", f, ref);
          }
          const f = { detail: `nessun testo (finishReason ${finishReason || "?"})` };
          logGeminiFailure({ ref, model, attempt, code: "empty", f, final: false });
          last = new AiError("empty", "risposta vuota", f, ref);
          break; // the next model may do better
        }
        return round;
      } catch (e) {
        if (e instanceof AiError) throw e;
        if (opts.signal?.aborted) throw toAiError(e, { signal: opts.signal, ref });
        const started = round.parts.length > 0;
        const noFirstChunk = (attemptCtrl.signal.reason as { name?: string } | undefined)?.name === "FirstChunkTimeout";
        const f: GeminiFailure = noFirstChunk ? { detail: `nessuna risposta entro ${firstChunkMs / 1000} s` } : parseGeminiError(e);
        const code = noFirstChunk ? "unavailable" : classifyGemini(f);
        const err = new AiError(code, f.detail, f, ref);
        if (started) {
          // text already reached the user: never restart the answer
          logGeminiFailure({ ref, model, attempt, code, f, final: true });
          throw err;
        }
        if (withThinking && isThinkingRejected(f)) {
          withThinking = false; // same model without the thinking config
          continue;
        }
        if (withTools && isToolsRejected(f)) {
          logGeminiFailure({ ref, model, attempt, code, f, final: false });
          withTools = false; // same model, text only: the chat keeps working
          continue;
        }
        if (isFatalForChain(code)) {
          logGeminiFailure({ ref, model, attempt, code, f, final: true });
          throw err;
        }
        if (isTransient(code) && !noFirstChunk && retriesLeft > 0) {
          logGeminiFailure({ ref, model, attempt, code, f, final: false });
          await pause(500 * 3 ** (MAX_RETRIES - retriesLeft) + Math.random() * 250, opts.signal);
          retriesLeft--;
          if (opts.signal?.aborted) throw toAiError(e, { signal: opts.signal, ref });
          continue;
        }
        // quota ids (PerDay…) and retry delays are in the details, not in the short message
        if (code === "network") {
          // the connection, not the model: another model would fail the same way, and nothing needs to rest
          logGeminiFailure({ ref, model, attempt, code, f, final: true });
          throw err;
        }
        const kind = noFirstChunk ? "busy" : failureKind(f.status, f.raw ?? f.detail);
        logGeminiFailure({ ref, model, attempt, code, f, final: false });
        if (kind || isTransient(code)) coolDown(model, kind ?? "busy", f.raw ?? f.detail);
        last = err;
        break; // try the next free model
      } finally {
        clearTimeout(firstChunkTimer);
        opts.signal?.removeEventListener("abort", onParentAbort);
      }
    }
  }
  const final = last ?? new AiError("error", "nessun modello disponibile", undefined, ref);
  if (last?.failure) logGeminiFailure({ ref, code: final.code, f: last.failure, final: true, model: "(tutti i modelli)" });
  throw final;
}

/** Lists the models this API key can use (admin helper). */
export async function listAvailableModels(): Promise<string[]> {
  const ai = getClient();
  const out: string[] = [];
  try {
    const pager = await ai.models.list({ config: { pageSize: 100 } });
    for await (const m of pager) {
      const name = (m.name ?? "").replace(/^models\//, "");
      if (/^(gemini|gemma)-/.test(name) && (m.supportedActions ?? []).includes("generateContent")) out.push(name);
    }
  } catch (e) {
    const err = toAiError(e);
    if (err.failure) logGeminiFailure({ ref: err.ref, op: "models.list", code: err.code, f: err.failure, final: true });
    throw err;
  }
  return out.sort();
}
