// AI writing assistant — where it appears, what each text is, and the
// request format. Shared by the editor (browser) and the API route.
import { z } from "@/lib/zod-it";

export const WRITING_TONES = {
  romantic: "Romantico",
  sweet: "Dolce",
  funny: "Ironico",
  deep: "Profondo",
  simple: "Semplice",
  personal: "Molto personale",
} as const;
export type WritingTone = keyof typeof WRITING_TONES;

export const WRITING_LENGTHS = { short: "Breve", medium: "Media", long: "Lunga" } as const;
export type WritingLength = keyof typeof WRITING_LENGTHS;

export type WritingTarget = {
  /** "la dedica" — for sentences like "Scrivi la dedica" */
  noun: string;
  /** "compact" for short texts, "letter" for long ones (bigger editor and panel) */
  layout: "compact" | "letter";
  /** the button in the editor */
  button: string;
  /** approximate words for each length */
  words: Record<WritingLength, [number, number]>;
  defaultLength: WritingLength;
  /** form fields sent as context (nothing else leaves the form) */
  details: string[];
  /** example for "Cosa vuoi dirle?" */
  hintPlaceholder: string;
};

/** Only the texts where help really makes sense: never titles, links, settings… */
export const WRITING_TARGETS = {
  "dedications.body": {
    noun: "la dedica",
    layout: "compact",
    button: "Genera con AI",
    words: { short: [25, 50], medium: [60, 110], long: [130, 200] },
    defaultLength: "short",
    details: ["title", "category"],
    hintPlaceholder: "Es. che mi manca tanto, che sono fiero di lei per l'esame…",
  },
  "open_when_cards.body": {
    noun: "la lettera «Aprimi quando…»",
    layout: "letter",
    button: "Aiutami a scriverla",
    words: { short: [60, 100], medium: [120, 200], long: [220, 350] },
    defaultLength: "medium",
    details: ["title"],
    hintPlaceholder: "Es. ricordale che può chiamarmi a qualsiasi ora…",
  },
  "time_capsules.body": {
    noun: "la lettera della capsula del tempo",
    layout: "letter",
    button: "Aiutami a scriverla",
    words: { short: [100, 160], medium: [200, 320], long: [350, 550] },
    defaultLength: "medium",
    details: ["title", "teaser", "unlock_at"],
    hintPlaceholder: "Es. cosa spero per noi tra un anno, quanto sono orgoglioso di lei…",
  },
  "memories.body": {
    noun: "il racconto del ricordo",
    layout: "letter",
    button: "Aiutami a raccontarlo",
    words: { short: [40, 80], medium: [90, 160], long: [180, 280] },
    defaultLength: "short",
    details: ["title", "kind", "happened_on", "place"],
    hintPlaceholder: "Cosa ricordi di quel giorno? Es. pioveva, abbiamo riso tantissimo…",
  },
  "daily_surprises.body": {
    noun: "il pensiero di «Una cosa per te»",
    layout: "compact",
    button: "Genera con AI",
    words: { short: [15, 40], medium: [40, 80], long: [80, 140] },
    defaultLength: "short",
    details: ["title", "kind"],
    hintPlaceholder: "Es. una sfida piccola e buffa per oggi…",
  },
  "phrases.text": {
    noun: "la frase",
    layout: "compact",
    button: "Genera con AI",
    words: { short: [6, 15], medium: [12, 25], long: [20, 40] },
    defaultLength: "short",
    details: ["kind"],
    hintPlaceholder: "Es. qualcosa di dolce per quando si sveglia…",
  },
  "messages.reply": {
    noun: "la risposta",
    layout: "compact",
    button: "Aiutami a rispondere",
    words: { short: [15, 40], medium: [40, 90], long: [90, 160] },
    defaultLength: "short",
    details: [],
    hintPlaceholder: "Cosa vuoi dirle? Es. che ci sono e stasera la chiamo…",
  },
} as const satisfies Record<string, WritingTarget>;

export type WritingTargetKey = keyof typeof WRITING_TARGETS;
const TARGET_KEYS = Object.keys(WRITING_TARGETS) as [WritingTargetKey, ...WritingTargetKey[]];

export function writingTargetFor(resource: string, field: string): WritingTargetKey | null {
  const key = `${resource}.${field}`;
  return Object.hasOwn(WRITING_TARGETS, key) ? (key as WritingTargetKey) : null;
}

const text = (max: number) => z.string().max(max).optional().default("");

export const writeRequestSchema = z
  .object({
    target: z.enum(TARGET_KEYS),
    /** generate = a complete new version; edit = change the given text following the instruction */
    mode: z.enum(["generate", "edit"]),
    tone: z.enum(Object.keys(WRITING_TONES) as [WritingTone, ...WritingTone[]]).nullish(),
    length: z.enum(Object.keys(WRITING_LENGTHS) as [WritingLength, ...WritingLength[]]).nullish(),
    /** "Cosa vuoi dirle?" */
    hint: text(800),
    /** what Adam has in the editor right now */
    current: text(20000),
    /** the AI version being edited (edit mode) */
    draft: text(20000),
    /** the last AI version, so "Generane un'altra" really writes a different one */
    previous: text(20000),
    instruction: z.string().trim().max(500).optional().default(""),
    /** earlier instructions of this session (they still count) */
    history: z.array(z.string().trim().min(1).max(300)).max(8).optional().default([]),
    /** sentences Adam asked to keep word for word */
    keep: z.array(z.string().trim().min(1).max(300)).max(6).optional().default([]),
    /** the other fields of the form (filtered again by the server) */
    details: z
      .record(z.string(), z.unknown())
      .refine((d) => JSON.stringify(d).length <= 4000, "Dettagli troppo lunghi")
      .optional()
      .default({}),
    /** replies only: Viola's message is read by the AI only if Adam says so */
    messageId: z.uuid().nullish(),
  })
  .refine((r) => r.mode === "generate" || r.instruction.length > 0, { message: "Scrivi cosa vuoi cambiare", path: ["instruction"] })
  .refine((r) => r.mode === "generate" || (r.draft || r.current).trim().length > 0, { message: "Non c'è ancora un testo da modificare", path: ["draft"] });

export type WriteRequest = z.input<typeof writeRequestSchema>;
export type ParsedWriteRequest = z.output<typeof writeRequestSchema>;

/** Events streamed back by /api/admin/ai/write (one JSON per line). */
export type WritingEvent =
  | { t: "text"; v: string }
  | { t: "reset" }
  | { t: "done"; text: string; note: string; warning?: string }
  | { t: "error"; code: string; message: string };

// ---------------------------------------------------------------------------
// Sentences to keep word for word
// ---------------------------------------------------------------------------

const KEEP_VERB = /(non\s+(la|lo|le|li|l'|l’)?\s*(cambiar|toccar|modificar)|mantien|lascia|tieni|uguale|identic|esattamente|così\s+com|parola\s+per\s+parola)/i;
const QUOTED = [/“([^”]{4,300})”/g, /«([^»]{4,300})»/g, /"([^"]{4,300})"/g, /‘(.{4,300}?)’(?!\p{L})/gu, /(?:^|[\s:(])'(.{4,300}?)'(?!\p{L})/gu];

/** «Questa frase non cambiarla: "Sei casa anche quando sei lontana."» → ["Sei casa anche quando sei lontana."] */
export function extractKeepPhrases(instruction: string): string[] {
  if (!KEEP_VERB.test(instruction)) return [];
  const found: string[] = [];
  for (const re of QUOTED) for (const m of instruction.matchAll(re)) found.push(m[1].trim());
  return [...new Set(found.filter((f) => f.length >= 4))].slice(0, 6);
}

const normalize = (s: string) =>
  s
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** Which kept sentences are not in the text (quotes and spaces don't matter). */
export function missingKeeps(text: string, keep: string[]): string[] {
  const t = normalize(text);
  return keep.filter((k) => !t.includes(normalize(k)));
}

// ---------------------------------------------------------------------------
// The model's answer: the text, then "§NOTA: …" (a short line for Adam)
// ---------------------------------------------------------------------------

/** While streaming, never show the note marker or what follows it. */
export const visibleDraft = (raw: string) => raw.split("§")[0].replace(/\s+$/, "");

export function splitNote(raw: string, opts: { signature?: string; adamName?: string } = {}): { text: string; note: string } {
  let body = raw;
  let note = "";
  const marker = body.search(/§\s*NOTA\s*:?/i);
  if (marker >= 0) {
    note = body.slice(marker).replace(/^§\s*NOTA\s*:?\s*/i, "");
    body = body.slice(0, marker);
  } else {
    const m = body.match(/\n\s*NOTA\s*:\s*([^\n]+)\s*$/i);
    if (m && m.index !== undefined) {
      note = m[1];
      body = body.slice(0, m.index);
    }
  }
  body = body
    .replace(/^\s*```[a-z]*\s*\n?/i, "")
    .replace(/\n?\s*```\s*$/i, "")
    .trim();
  // a text wrapped in quotes as a whole
  if (/^["“«][\s\S]+["”»]$/.test(body) && !/["“”«»]/.test(body.slice(1, -1))) body = body.slice(1, -1).trim();
  // the app adds the signature by itself
  const lines = body.split("\n");
  const last = lines[lines.length - 1]?.trim() ?? "";
  const sig = opts.signature?.trim();
  const name = (opts.adamName ?? "Adam").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (lines.length > 1 && ((sig && last === sig) || new RegExp(`^[—–-]?\\s*(il tuo |tuo )?${name}\\s*[♡❤️💗]*$`, "i").test(last))) body = lines.slice(0, -1).join("\n").trim();
  note = note.split("\n")[0].trim().slice(0, 200);
  return { text: body, note };
}
