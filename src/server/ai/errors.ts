// ---------------------------------------------------------------------------
// Gemini errors: what really went wrong, in words.
//
// Google answers with an HTTP status plus a JSON body ({ error: { code,
// status, message, details: [{ reason }] } }); the @google/genai SDK puts that
// body in ApiError.message (double-encoded when streaming). Before, every
// 400/401/403 became the generic "Ops, qualcosa si è inceppato": an invalid key
// (400 API_KEY_INVALID) was indistinguishable from a real bug. Here each
// failure gets a precise code, a precise message for Adam and a gentle one for
// Viola — and never the API key.
// ---------------------------------------------------------------------------

export type AiErrorCode =
  | "not_configured" // no GEMINI_API_KEY
  | "invalid_key" // key wrong, expired or copied badly
  | "permission" // key restricted, API disabled, project blocked
  | "region" // Gemini not available from the server's location
  | "billing" // the free tier is not available for this key/project
  | "model_not_found" // no model of the chain exists for this key
  | "limit" // quota / rate limit on every model
  | "bad_request" // Google refused the request itself
  | "unavailable" // 5xx after retries
  | "network" // the server cannot reach Google
  | "timeout" // too slow
  | "blocked" // safety filters
  | "empty" // the model answered with nothing
  | "stopped" // the user stopped it
  | "error"; // anything else

export type GeminiFailure = {
  /** HTTP status, when Google answered */
  status?: number;
  /** google.rpc.ErrorInfo reason, e.g. API_KEY_INVALID, SERVICE_DISABLED */
  reason?: string;
  /** canonical status, e.g. INVALID_ARGUMENT, PERMISSION_DENIED */
  apiStatus?: string;
  /** Google's own message (sanitized, short) */
  detail: string;
  /** low-level network error code (ECONNRESET, ENOTFOUND…) */
  netCode?: string;
  /** the whole answer (sanitized): quota ids and retry delays live in its details */
  raw?: string;
};

/** Never let a key end up in a log or a message. */
export function sanitize(text: string) {
  return text
    .replace(/AIza[0-9A-Za-z_-]{8,}/g, "AIza…****")
    .replace(/([?&]key=)[^&\s"]+/gi, "$1****")
    .replace(/(x-goog-api-key["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, "$1****");
}

type GoogleError = { code?: unknown; status?: unknown; message?: unknown; details?: unknown };

/** { error: { message: "{ error: { … } }" } } → the innermost Google error object. */
function innermostError(raw: string): GoogleError | null {
  let current: unknown = raw;
  let found: GoogleError | null = null;
  for (let i = 0; i < 4 && typeof current === "string"; i++) {
    try {
      const json = JSON.parse(current) as { error?: GoogleError } & GoogleError;
      const e = json?.error ?? json;
      if (!e || typeof e !== "object") break;
      found = e;
      current = e.message;
    } catch {
      break;
    }
  }
  return found;
}

/** Reads status, reason and message from an SDK/fetch error. */
export function parseGeminiError(e: unknown): GeminiFailure {
  const err = e as { status?: unknown; message?: unknown; code?: unknown; cause?: { code?: unknown } };
  const raw = typeof err?.message === "string" ? err.message : String(e ?? "");
  const g = innermostError(raw);
  const details = Array.isArray(g?.details) ? (g.details as { reason?: unknown }[]) : [];
  const status = typeof err?.status === "number" ? err.status : typeof g?.code === "number" ? g.code : undefined;
  const reason = (details.find((d) => typeof d?.reason === "string")?.reason as string | undefined) ?? raw.match(/\\?"reason\\?"\s*:\s*\\?"([A-Z_]+)/)?.[1];
  const apiStatus = typeof g?.status === "string" ? g.status : raw.match(/\\?"status\\?"\s*:\s*\\?"([A-Z_]+)/)?.[1];
  const message = typeof g?.message === "string" && !g.message.trim().startsWith("{") ? g.message : raw;
  const detail = sanitize(message.replace(/\s+/g, " ").trim()).slice(0, 300);
  const netCode = typeof err?.cause?.code === "string" ? err.cause.code : typeof err?.code === "string" ? err.code : undefined;
  return { status, reason, apiStatus, detail, netCode, raw: sanitize(raw).slice(0, 4000) };
}

const NETWORK = /fetch failed|network|ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|socket|terminated|UND_ERR/i;

/** The precise kind of failure (a timeout is decided by the caller, who owns the clock). */
export function classifyGemini(f: GeminiFailure): AiErrorCode {
  const { status, reason = "", apiStatus = "", detail } = f;
  const text = `${reason} ${apiStatus} ${detail}`;
  if (!status) return NETWORK.test(`${detail} ${f.netCode ?? ""}`) || f.netCode ? "network" : "error";
  if (/API_KEY_INVALID|API_KEY_EXPIRED|API key not valid|API key expired|invalid api key/i.test(text) || status === 401) return "invalid_key";
  if (/location is not supported|user location/i.test(text)) return "region";
  if (status === 402 || /BILLING|billing|free tier is not available|prepay/i.test(text)) return "billing";
  if (status === 403) return "permission";
  if (status === 404) return "model_not_found";
  if (status === 429) return "limit";
  if (status === 400 && /safety|blocked|prohibited/i.test(text)) return "blocked";
  if (status === 400 || status === 413 || status === 422) return "bad_request";
  if (status >= 500) return "unavailable";
  return "error";
}

/** Worth trying again (same model, after a pause): the service or the network hiccuped. */
export const isTransient = (code: AiErrorCode) => code === "unavailable" || code === "network";
/** The same failure would happen with every model: stop at once. */
export const isFatalForChain = (code: AiErrorCode) =>
  code === "invalid_key" || code === "permission" || code === "region" || code === "billing" || code === "not_configured" || code === "blocked";

const PERMISSION_HINT: Record<string, string> = {
  SERVICE_DISABLED: "la «Generative Language API» non è attiva nel progetto Google della chiave: attivala, oppure crea la chiave da Google AI Studio (aistudio.google.com)",
  API_KEY_HTTP_REFERRER_BLOCKED: "la chiave accetta solo alcuni siti web (restrizione «referrer»): una chiamata dal server non ha referrer. Togli la restrizione o crea una chiave nuova da AI Studio",
  API_KEY_IP_ADDRESS_BLOCKED: "la chiave accetta solo alcuni indirizzi IP, e i server di Vercel cambiano IP. Togli la restrizione",
  API_KEY_SERVICE_BLOCKED: "la chiave è limitata ad altre API: aggiungi «Generative Language API» alle API consentite o togli la restrizione",
  API_KEY_ANDROID_APP_BLOCKED: "la chiave è limitata a un'app Android: togli la restrizione",
  API_KEY_IOS_APP_BLOCKED: "la chiave è limitata a un'app iOS: togli la restrizione",
  CONSUMER_SUSPENDED: "il progetto Google della chiave è sospeso",
  ACCESS_TOKEN_SCOPE_INSUFFICIENT: "la chiave non ha i permessi per Gemini",
};

export type AiAudience = "viola" | "admin";
export type AiTexts = { aiPause: string; aiOffline: string; errorText: string };

/**
 * The message shown in the app. Adam gets the precise cause and what to do;
 * Viola gets a gentle sentence without technical words.
 */
export function aiErrorMessage(code: AiErrorCode, audience: AiAudience, texts: AiTexts, f?: GeminiFailure, ref?: string): string {
  const tag = ref ? ` (rif. ${ref})` : "";
  if (audience === "viola") {
    switch (code) {
      case "limit":
        return texts.aiPause;
      case "timeout":
        return "Ci sto mettendo troppo a rispondere. Riprova tra poco ♡";
      case "network":
        return "Non riesco a collegarmi in questo momento. Controlla la connessione e riprova ♡";
      case "unavailable":
        return "Il servizio che mi fa pensare è un po' lento adesso. Riprova tra poco ♡";
      case "blocked":
        return "Non posso rispondere a questa richiesta. Proviamo in un altro modo? ♡";
      case "empty":
        return "Questa volta non mi è uscito niente. Riprova ♡";
      case "not_configured":
        return texts.aiOffline;
      case "invalid_key":
      case "permission":
      case "region":
      case "billing":
      case "model_not_found":
      case "bad_request":
        return "Adam AI non riesce a collegarsi in questo momento. Non è colpa tua: è una cosa da sistemare nelle impostazioni, e Adam può farlo. Intanto i pulsanti qui sotto funzionano ♡";
      default:
        return texts.errorText;
    }
  }
  const check = " Controllo completo: Admin → Adam AI → «Prova Gemini».";
  switch (code) {
    case "not_configured":
      return "Manca GEMINI_API_KEY sul server: aggiungila su Vercel (Settings → Environment Variables) e fai Redeploy.";
    case "invalid_key":
      return `Google rifiuta la chiave Gemini (${f?.reason ?? f?.status ?? "chiave non valida"}): la GEMINI_API_KEY su Vercel non è valida, è scaduta o è stata copiata male. Creane una nuova su Google AI Studio, incollala su Vercel e fai Redeploy.${check}${tag}`;
    case "permission":
      return `Google non permette a questa chiave di usare Gemini (403${f?.reason ? ` ${f.reason}` : ""}): ${PERMISSION_HINT[f?.reason ?? ""] ?? "controlla le restrizioni della chiave o creane una nuova su Google AI Studio"}.${check}${tag}`;
    case "region":
      return `Gemini non è disponibile dalla regione del server (${f?.apiStatus ?? f?.status}). Su Vercel imposta la regione delle funzioni in Europa (Settings → Functions → Region, es. Frankfurt) e fai Redeploy.${tag}`;
    case "billing":
      return `Google chiede un piano a pagamento per questa chiave o questo modello (${f?.reason ?? f?.status}). L'app non attiva mai pagamenti: usa una chiave gratuita di Google AI Studio.${check}${tag}`;
    case "model_not_found":
      return `Nessuno dei modelli configurati esiste per questa chiave (404). Controlla «Modello Gemini» in Admin → Adam AI (o togli GEMINI_MODEL su Vercel).${check}${tag}`;
    case "limit":
      return "Quota gratuita finita per ora su tutti i modelli (429). Si ricarica da sola; il limite al minuto dopo pochi secondi, quello giornaliero verso le 9 di mattina.";
    case "bad_request":
      return `Google ha rifiutato la richiesta (400: «${f?.detail ?? "richiesta non valida"}»).${check}${tag}`;
    case "unavailable":
      return `I server di Gemini non rispondono (${f?.status ?? "5xx"}), anche dopo nuovi tentativi. Riprova tra poco.${tag}`;
    case "network":
      return `Il server non riesce a raggiungere Gemini (rete${f?.netCode ? `: ${f.netCode}` : ""}). Riprova tra poco.${tag}`;
    case "timeout":
      return "Gemini ci ha messo troppo a rispondere e ho interrotto la richiesta. Riprova tra poco.";
    case "blocked":
      return "Gemini ha bloccato la risposta per i suoi filtri di sicurezza. Prova a dirlo in un altro modo.";
    case "empty":
      return "Gemini ha risposto senza testo. Riprova.";
    default:
      return `Risposta inattesa da Gemini${f?.status ? ` (${f.status})` : ""}${f?.detail ? `: «${f.detail}»` : ""}.${check}${tag}`;
  }
}

/** Short reference shown to Adam and written in the server log, to match the two. */
export const newErrorRef = () => `G-${Math.random().toString(36).slice(2, 8)}`;

/** One line in the server log with everything needed to understand the failure — never the key. */
export function logGeminiFailure(info: { ref?: string; model?: string; attempt?: number; code: AiErrorCode; f: GeminiFailure; final: boolean; op?: string }) {
  const line = {
    at: new Date().toISOString(),
    ref: info.ref,
    op: info.op ?? "generateContentStream",
    endpoint: "generativelanguage.googleapis.com/v1beta",
    model: info.model,
    attempt: info.attempt,
    code: info.code,
    status: info.f.status,
    apiStatus: info.f.apiStatus,
    reason: info.f.reason,
    net: info.f.netCode,
    detail: info.f.detail,
  };
  (info.final ? console.error : console.warn)(`[gemini] ${info.final ? "request failed" : "attempt failed"} ${JSON.stringify(line)}`);
}
