import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { SettingsMap } from "@/features/settings/schema";
import { serverEnv } from "@/server/env";
import { listAvailableModels, toAiError } from "./gemini";
import { modelChain } from "./models";
import { aiErrorMessage, isFatalForChain, logGeminiFailure, type AiErrorCode } from "./errors";

// ---------------------------------------------------------------------------
// "Prova Gemini": does the configured key really work? Runs on the server
// with the real environment (Vercel), sends the smallest possible request and
// says exactly what Google answered. The key is never returned: only whether
// it exists, its length and a masked form (AIza…****).
// ---------------------------------------------------------------------------

export type GeminiProbe = { model: string; ok: boolean; ms: number; answer?: string; code?: AiErrorCode; status?: number; reason?: string; detail?: string };

export type GeminiCheck = {
  key: { present: boolean; masked: string; length: number; looksLikeAiStudio: boolean; cleaned: boolean };
  /** only for the automated tests: must be empty in production */
  baseUrlOverride: boolean;
  envModel: string;
  chain: string[];
  list: { ok: boolean; models?: string[]; missing?: string[]; code?: AiErrorCode; status?: number; reason?: string; detail?: string };
  probes: GeminiProbe[];
  verdict: { ok: boolean; title: string; text: string };
};

export const maskKey = (key: string) => (key ? `${key.slice(0, 4)}…****` : "");
/** Inside "Prova Gemini" the hint to open "Prova Gemini" is pointless. */
const here = (text: string) => text.replace(/ Controllo completo: Admin → Adam AI → «Prova Gemini»\./, "");

export async function diagnoseGemini(settings: SettingsMap, opts: { maxProbes?: number } = {}): Promise<GeminiCheck> {
  const key = serverEnv.geminiApiKey;
  const raw = process.env.GEMINI_API_KEY ?? "";
  const chain = modelChain(settings, serverEnv.geminiModel, { textOnly: true });
  const check: GeminiCheck = {
    key: { present: Boolean(key), masked: maskKey(key), length: key.length, looksLikeAiStudio: /^AIza[0-9A-Za-z_-]{35}$/.test(key), cleaned: Boolean(key) && raw !== key },
    baseUrlOverride: Boolean(process.env.GEMINI_BASE_URL),
    envModel: serverEnv.geminiModel,
    chain,
    list: { ok: false },
    probes: [],
    verdict: { ok: false, title: "", text: "" },
  };
  const texts = settings.texts;
  if (!key) {
    check.verdict = { ok: false, title: "Manca la chiave", text: aiErrorMessage("not_configured", "admin", texts) };
    return check;
  }

  // 1) which models does this key see? (no quota used)
  try {
    const models = await listAvailableModels();
    const available = new Set(models);
    check.list = { ok: true, models, missing: chain.filter((m) => !available.has(m)) };
  } catch (e) {
    const err = toAiError(e);
    check.list = { ok: false, code: err.code, status: err.failure?.status, reason: err.failure?.reason, detail: err.failure?.detail ?? err.message };
    if (isFatalForChain(err.code)) {
      check.verdict = { ok: false, title: titleFor(err.code), text: here(aiErrorMessage(err.code, "admin", texts, err.failure, err.ref)) };
      return check;
    }
  }

  // 2) the smallest real request, model after model, until one answers
  const baseUrl = process.env.GEMINI_BASE_URL;
  const ai = new GoogleGenAI({ apiKey: key, ...(baseUrl ? { httpOptions: { baseUrl } } : {}) });
  const candidates = check.list.ok ? chain.filter((m) => check.list.models!.includes(m)).concat(chain.filter((m) => !check.list.models!.includes(m))) : chain;
  for (const model of candidates.slice(0, opts.maxProbes ?? 4)) {
    const t0 = Date.now();
    try {
      // the same call the chat makes (streaming), with the smallest possible question
      const stream = await ai.models.generateContentStream({
        model,
        contents: "Rispondi solo con la parola OK.",
        config: { maxOutputTokens: 256, temperature: 0, abortSignal: AbortSignal.timeout(20_000) },
      });
      let answer = "";
      for await (const chunk of stream) answer += chunk.text ?? "";
      check.probes.push({ model, ok: true, ms: Date.now() - t0, answer: answer.trim().slice(0, 40) });
      break;
    } catch (e) {
      const err = toAiError(e);
      if (err.failure) logGeminiFailure({ ref: err.ref, op: "diagnose", model, code: err.code, f: err.failure, final: false });
      check.probes.push({ model, ok: false, ms: Date.now() - t0, code: err.code, status: err.failure?.status, reason: err.failure?.reason, detail: err.failure?.detail ?? err.message });
      if (isFatalForChain(err.code)) break; // every model would answer the same
    }
  }

  const good = check.probes.find((p) => p.ok);
  const bad = check.probes.filter((p) => !p.ok);
  if (good) {
    const first = good.model === chain[0];
    const firstMissing = check.list.ok && !check.list.models!.includes(chain[0]);
    check.verdict = {
      ok: true,
      title: "Gemini funziona",
      text: [
        `${good.model} ha risposto «${good.answer || "…"}» in ${good.ms} ms.`,
        firstMissing ? `Il primo modello configurato («${chain[0]}») non esiste per questa chiave: correggi «Modello Gemini» qui sotto${check.envModel ? " o GEMINI_MODEL su Vercel" : ""}. Intanto Adam AI usa da solo i modelli che funzionano.` : "",
        !first && bad.length ? `Non hanno risposto: ${bad.map((b) => `${b.model} (${b.code})`).join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    };
  } else if (bad.length) {
    const last = bad[bad.length - 1];
    const worst = bad.find((b) => isFatalForChain(b.code!)) ?? last;
    check.verdict = { ok: false, title: titleFor(worst.code!), text: here(aiErrorMessage(worst.code!, "admin", texts, { status: worst.status, reason: worst.reason, detail: worst.detail ?? "" })) };
  } else {
    check.verdict = { ok: false, title: "Nessun modello da provare", text: "La lista dei modelli è vuota: controlla «Modello Gemini» in questa pagina." };
  }
  return check;
}

function titleFor(code: AiErrorCode) {
  const t: Partial<Record<AiErrorCode, string>> = {
    invalid_key: "La chiave Gemini non è valida",
    permission: "La chiave non ha il permesso di usare Gemini",
    region: "Gemini non è disponibile dalla regione del server",
    billing: "Serve un piano a pagamento per questa chiave",
    model_not_found: "I modelli configurati non esistono",
    limit: "Quota gratuita finita per ora",
    network: "Il server non raggiunge Google",
    unavailable: "Gemini non risponde",
    timeout: "Gemini troppo lento",
    bad_request: "Google ha rifiutato la richiesta",
  };
  return t[code] ?? "Gemini non risponde";
}
