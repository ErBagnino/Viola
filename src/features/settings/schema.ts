import { z } from "@/lib/zod-it";

// ---------------------------------------------------------------------------
// App settings — every text / option Adam can change without touching code.
// Stored in public.app_settings (key -> jsonb). Missing or invalid fields
// always fall back to these defaults, so the app works with an empty table.
// ---------------------------------------------------------------------------

const text = (max: number, d: string) => z.string().trim().max(max).default(d);
const list = (max: number, d: string[]) => z.array(z.string().trim().min(1).max(max)).max(40).default(d);

export const generalSchema = z.object({
  appName: z.string().trim().min(1).max(40).default("Vio ♡"),
  shortName: z.string().trim().min(1).max(14).default("Vio ♡"),
  violaName: text(40, "Viola"),
  violaNickname: text(40, "Vio"),
  adamName: text(40, "Adam"),
  signature: text(80, "— Adam ♡"),
  timezone: text(60, "Europe/Rome"),
  loginTitle: text(120, "Benvenuta nella nostra piccola casa."),
  loginSubtitle: text(200, "Un piccolo mondo fatto da Adam, solo per te."),
  homeGreeting: text(80, "Ciao Vio ♡"),
  homeQuestion: text(120, "Come stai oggi?"),
  needsTitle: text(80, "Di cosa hai bisogno?"),
  showDaAdam: z.boolean().default(true),
  /** "Insieme da N giorni ♡" in Noi — empty = hidden */
  togetherSince: z
    .union([z.iso.date(), z.literal(""), z.null()])
    .default("")
    .transform((v) => v || ""),
});

export const onboardingSchema = z.object({
  enabled: z.boolean().default(true),
  slides: z
    .array(z.object({ title: z.string().trim().min(1).max(160), text: z.string().trim().max(400).default("") }))
    .min(1)
    .max(6)
    .default([
      { title: "Benvenuta nella nostra piccola casa.", text: "" },
      { title: "Questo posto esiste per ricordarti una cosa.", text: "" },
      { title: "Non devi affrontare tutto da sola.", text: "" },
    ]),
  cta: text(40, "♡ Entriamo"),
});

export const fearStepSchema = z.object({
  title: z.string().trim().min(1).max(80),
  text: z.string().trim().max(400).default(""),
});

export const textsSchema = z.object({
  calmTitle: text(80, "Ho bisogno di calmarmi"),
  calmEnd: text(200, "Brava. Un passo alla volta. ♡"),
  breathingEnd: text(200, "Brava. Un passo alla volta. ♡"),
  groundingEnd: text(200, "Sei qui. Va bene così. ♡"),
  fearIntro1: text(200, "Ok. Non dobbiamo risolvere tutto adesso."),
  fearIntro2: text(200, "Facciamo una cosa alla volta."),
  fearSteps: z
    .array(fearStepSchema)
    .min(1)
    .max(8)
    .default([
      { title: "Piedi a terra", text: "Appoggia bene i piedi a terra. Senti il pavimento che ti sostiene." },
      { title: "Guarda qualcosa", text: "Scegli una cosa vicino a te e guardala bene: il colore, la forma, i bordi." },
      { title: "Respira", text: "Inspira piano dal naso… ed espira ancora più piano. Facciamolo insieme." },
      { title: "Cosa senti?", text: "Dai un nome a quello che senti. Non serve che sia preciso." },
      { title: "Cosa vuoi fare adesso?", text: "Scegli tu. Qualsiasi scelta va bene." },
    ]),
  fearFeelings: list(40, ["Paura", "Agitazione", "Tristezza", "Rabbia", "Confusione", "Stanchezza", "Solitudine", "Non lo so"]),
  needAdamTitle: text(80, "Ho bisogno di Adam"),
  needAdamButton: text(60, "HO BISOGNO DI ADAM ♡"),
  needAdamPlaceholder: text(120, "Vuoi aggiungere qualcosa? (facoltativo)"),
  needAdamSent: text(200, "Adam è stato avvisato. ♡ Arriva appena può."),
  /** one-tap answers in Adam's "Ho bisogno di Adam" inbox */
  quickReplies: list(120, ["Arrivo ♡", "Ti chiamo tra 5 minuti ♡", "Sono qui. Respira con me ♡", "Ti scrivo su WhatsApp adesso ♡"]),
  needAdamFallback: text(200, "Ho salvato la tua richiesta. Ora scrivigli direttamente. ♡"),
  hugTitle: text(80, "Voglio un abbraccio"),
  quizPerfect: text(160, "Mi conosci meglio di chiunque ♡"),
  quizGood: text(160, "Mi conosci proprio bene ♡"),
  quizLow: text(160, "Ok, questa me la devi spiegare 😂"),
  secretMessage: text(300, "Hai trovato un segreto. Ti penso anche adesso, proprio adesso ♡"),
  countdownToday: text(80, "È oggi. ♡"),
  countdownDone: text(80, "È già successo ♡"),
  countdownMeetingLead: text(60, "per rivederti"),
  capsuleLocked: text(160, "Questa lettera non è ancora pronta."),
  capsuleReady: text(160, "Una lettera per te è arrivata. ♡"),
  errorText: text(160, "Ops, qualcosa si è inceppato. Riproviamo. ♡"),
  aiOffline: text(160, "Adam AI è momentaneamente offline."),
  aiPause: text(200, "Adam AI ha bisogno di una piccola pausa. Puoi riprovare più tardi. ♡"),
  safetyNote: text(
    300,
    "Questa app è un piccolo rifugio, non una terapia. Se sei in pericolo o stai molto male, chiama subito il 112 o una persona di cui ti fidi.",
  ),
});

export const contactSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[0-9 ]*$/, "Solo cifre, es. 393331234567")
    .default(""),
  phoneNumber: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[0-9 ]*$/, "Solo cifre, es. +393331234567")
    .default(""),
  whatsappMessages: list(200, [
    "Ciao Adam, ho bisogno di te ♡",
    "Puoi chiamarmi?",
    "Puoi scrivermi?",
    "Ho bisogno di sentirti.",
  ]),
  emergencyNumber: z.string().trim().max(10).default("112"),
});

export const notificationsSchema = z.object({
  mode: z.enum(["fallback", "all"]).default("fallback"),
  notifyOnMessage: z.boolean().default(true),
  notifyOnSharedJournal: z.boolean().default(true),
  notifyOnLowMood: z.boolean().default(false),
  notifyOnHeart: z.boolean().default(true),
  telegramChatId: z
    .string()
    .trim()
    .max(40)
    .regex(/^-?[0-9]*$/, "Il chat ID è un numero")
    .default(""),
});

export const aiModes = ["general", "personal", "comfort"] as const;
export type AiMode = (typeof aiModes)[number];

export const aiSchema = z.object({
  enabled: z.boolean().default(true),
  model: z.string().trim().max(80).default("gemini-flash-latest"),
  fallbackModels: list(80, ["gemini-flash-lite-latest"]),
  /** when a model's free quota runs out, try every other free model (never paid ones) */
  autoFreeModels: z.boolean().default(true),
  dailyMessageLimit: z.number().int().min(0).max(5000).default(60),
  dailyTokenBudget: z.number().int().min(0).max(10_000_000).default(300_000),
  perMinuteLimit: z.number().int().min(1).max(60).default(6),
  maxOutputTokens: z.number().int().min(64).max(8192).default(1024),
  temperature: z.number().min(0).max(2).default(0.8),
  tone: text(300, "caldo, affettuoso, giocoso, mai sdolcinato"),
  personality: text(
    1500,
    "Sei curioso, paziente e simpatico. Spieghi le cose in modo semplice, con esempi concreti. Sai scherzare, ma capisci quando è il momento di essere delicato.",
  ),
  verbosity: z.enum(["short", "medium", "long"]).default("medium"),
  language: text(40, "italiano"),
  preferredPhrases: list(200, []),
  context: text(3000, ""),
  restrictions: text(2000, ""),
  defaultMode: z.enum(aiModes).default("general"),
  copilotEnabled: z.boolean().default(true),
  copilotDailyLimit: z.number().int().min(0).max(5000).default(80),
});

export const aiProfileSchema = z.object({
  name: z.string().trim().min(1).max(40).default("Adam AI"),
  subtitle: text(120, "Puoi chiedermi qualsiasi cosa."),
  bio: text(400, "Un assistente creato da Adam per Viola. Non sono Adam: sono la sua intelligenza artificiale."),
  welcome: text(300, "Eccomi. Cosa vuoi sapere?"),
  signature: text(60, "— Adam AI ♡"),
  avatarMediaId: z.uuid().nullable().default(null),
  quickActions: list(80, [
    "Spiegami qualcosa",
    "Fammi ridere",
    "Intrattienimi",
    "Parliamo",
    "Mi sento agitata",
    "Mi manca Adam",
    "Fammi una sorpresa",
  ]),
});

export const distanceSchema = z.object({
  fromName: text(60, "Torino"),
  fromLat: z.number().min(-90).max(90).default(45.0703),
  fromLng: z.number().min(-180).max(180).default(7.6869),
  toName: text(60, "Rosolina"),
  toLat: z.number().min(-90).max(90).default(45.0758),
  toLng: z.number().min(-180).max(180).default(12.2447),
  fromLabel: text(40, ""),
  toLabel: text(40, ""),
  countdownId: z.uuid().nullable().default(null),
  note: text(200, "Anche da lontano, un filo ci tiene vicini."),
});

export const calmSchema = z.object({
  defaultMode: z.enum(["choose", "random"]).default("choose"),
  timers: z.array(z.number().int().min(0).max(3600)).max(6).default([60, 120, 300, 0]),
});

export const costSchema = z.object({
  dbLimitMb: z.number().min(1).max(100_000).default(500),
  storageLimitMb: z.number().min(1).max(100_000).default(1024),
  warnPercent: z.number().int().min(10).max(100).default(75),
});

export const settingsSchemas = {
  general: generalSchema,
  onboarding: onboardingSchema,
  texts: textsSchema,
  contact: contactSchema,
  notifications: notificationsSchema,
  ai: aiSchema,
  ai_profile: aiProfileSchema,
  distance: distanceSchema,
  calm: calmSchema,
  cost: costSchema,
} as const;

export type SettingsKey = keyof typeof settingsSchemas;
export type SettingsMap = { [K in SettingsKey]: z.infer<(typeof settingsSchemas)[K]> };

/** Keys Viola's area may read (the rest are admin-only). */
export const PUBLIC_SETTINGS: readonly SettingsKey[] = [
  "general",
  "onboarding",
  "texts",
  "contact",
  "ai_profile",
  "distance",
  "calm",
];

export function isSettingsKey(v: string): v is SettingsKey {
  return Object.prototype.hasOwnProperty.call(settingsSchemas, v);
}

/**
 * Parses a stored value, dropping any invalid top-level field so that a
 * single bad value never breaks the whole app (it falls back to default).
 */
export function parseSettings<K extends SettingsKey>(key: K, value: unknown): SettingsMap[K] {
  const schema = settingsSchemas[key] as unknown as z.ZodType<SettingsMap[K]>;
  let candidate: Record<string, unknown> =
    value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
  for (let i = 0; i < 50; i++) {
    const res = schema.safeParse(candidate);
    if (res.success) return res.data;
    const bad = new Set(res.error.issues.map((iss) => String(iss.path[0] ?? "")));
    if (bad.has("")) break;
    for (const k of bad) delete candidate[k];
  }
  candidate = {};
  return schema.parse(candidate);
}

export function defaultSettings<K extends SettingsKey>(key: K): SettingsMap[K] {
  return parseSettings(key, {});
}
