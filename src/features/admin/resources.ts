import { z } from "zod";
import { APP_ACTION_KEYS } from "@/features/actions/registry";
import { BREATHING_VISUALS } from "@/features/breathing/types";
import {
  AI_MEMORY_CATEGORIES,
  AUDIO_CATEGORIES,
  COMFORT_CATEGORIES,
  COUNTDOWN_KINDS,
  DEDICATION_CATEGORIES,
  HOME_WIDGETS,
  MEDIA_CONTEXTS,
  MEMORY_KINDS,
  OPEN_WHEN_ANIMATIONS,
  PHRASE_KINDS,
  SURPRISE_KINDS,
  TONE_OPTIONS,
} from "@/features/content/constants";
import { groundingStepSchema } from "@/features/grounding/types";

// ---------------------------------------------------------------------------
// Admin resource registry.
// One definition per editable table: form fields (UI), Zod validation,
// list behaviour, export and AI-copilot exposure. Used by the generic admin
// CRUD pages, the Adam AI Copilot tools and JSON import/export.
// ---------------------------------------------------------------------------

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "weight"
  | "boolean"
  | "select"
  | "date"
  | "datetime"
  | "image"
  | "audio"
  | "icon"
  | "color"
  | "tags"
  | "list"
  | "action"
  | "steps"
  | "options"
  | "contexts"
  | "pairs"
  | "numbers";

export type Option = { value: string; label: string };

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  hint?: string;
  required?: boolean;
  options?: Option[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  half?: boolean;
  /** extra list suggestions (tags / category) */
  suggestions?: string[];
};

const opts = (rec: Record<string, string | { label: string }>): Option[] =>
  Object.entries(rec).map(([value, v]) => ({ value, label: typeof v === "string" ? v : v.label }));


// --- reusable zod pieces ----------------------------------------------------
const str = (max: number) => z.string().trim().max(max);
const reqStr = (max: number, msg = "Campo obbligatorio") => z.string().trim().min(1, msg).max(max);
const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
const uuidOrNull = z
  .union([z.uuid(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));
const dateOrNull = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));
const datetime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Data e ora non valide").transform((v) => new Date(v).toISOString());
const datetimeOrNull = z
  .union([datetime, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));
const bool = (d: boolean) => z.boolean().default(d);
const int = (min: number, max: number, d: number) => z.coerce.number().int().min(min).max(max).default(d);
const enumOf = (rec: Record<string, unknown>, d: string) => z.enum(Object.keys(rec) as [string, ...string[]]).default(d);
const action = z.enum(APP_ACTION_KEYS as [string, ...string[]]).default("none");
const icon = optStr(40);
const tone = z
  .union([z.enum(Object.keys(TONE_OPTIONS) as [string, ...string[]]), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));
const stringList = (max: number, n = 30) => z.array(z.string().trim().min(1).max(max)).max(n).default([]);
const safeLink = z
  .union([
    z
      .string()
      .trim()
      .max(500)
      .refine((u) => /^(\/(?!\/)|https?:\/\/|tel:|mailto:)/i.test(u), "Link non valido (usa /percorso, https://, tel: o mailto:)"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => (v ? v : null));

// --- resource definitions ----------------------------------------------------
export type ResourceDef = {
  key: string;
  slug: string;
  table: string;
  label: string;
  singular: string;
  icon: string;
  description: string;
  titleField: string;
  subtitleField?: string;
  badgeField?: string;
  badgeOptions?: Option[];
  toggleField?: string;
  toggleLabel?: string;
  sortable?: boolean;
  order: { column: string; ascending: boolean }[];
  fields: FieldDef[];
  schema: z.ZodObject<z.ZodRawShape>;
  exportable: boolean;
  /** Adam AI Copilot tool names (singular snake case), false = not exposed */
  copilot: false | { name: string; create: boolean; update: boolean; delete: boolean; list: boolean };
  /** creation is done elsewhere (e.g. media upload) */
  noCreate?: boolean;
  /** cross-field validation on the merged row (returns an error message) */
  check?: (row: Record<string, unknown>) => string | null;
};

export const RESOURCES = {
  dedications: {
    key: "dedications",
    slug: "dediche",
    table: "dedications",
    label: "Dediche",
    singular: "Dedica",
    icon: "mail-heart",
    description: "Le lettere \"Per te ♡\": per quando è triste, ha paura, si sente sola…",
    titleField: "title",
    subtitleField: "body",
    badgeField: "category",
    badgeOptions: opts(DEDICATION_CATEGORIES),
    toggleField: "is_published",
    toggleLabel: "Pubblicata",
    sortable: true,
    order: [
      { column: "pinned", ascending: false },
      { column: "position", ascending: true },
    ],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "category", label: "Categoria", type: "select", options: opts(DEDICATION_CATEGORIES) },
      { name: "body", label: "Testo", type: "markdown", hint: "Puoi usare **grassetto**, _corsivo_, elenchi…" },
      { name: "media_id", label: "Foto", type: "image" },
      { name: "audio_id", label: "Audio (facoltativo)", type: "audio" },
      { name: "signature", label: "Firma (vuota = firma predefinita)", type: "text", placeholder: "— Adam ♡" },
      { name: "publish_at", label: "Pubblica a partire da", type: "datetime", hint: "Vuoto = subito" },
      { name: "pinned", label: "In evidenza", type: "boolean", half: true },
      { name: "is_published", label: "Pubblicata", type: "boolean", half: true },
    ],
    schema: z.object({
      title: reqStr(200),
      body: str(20000).default(""),
      category: enumOf(DEDICATION_CATEGORIES, "no_reason"),
      media_id: uuidOrNull,
      audio_id: uuidOrNull,
      signature: optStr(80),
      pinned: bool(false),
      position: int(0, 100000, 0),
      is_published: bool(true),
      publish_at: datetimeOrNull,
    }),
    exportable: true,
    copilot: { name: "dedication", create: true, update: true, delete: true, list: true },
  },
  memories: {
    key: "memories",
    slug: "ricordi",
    table: "memories",
    label: "Ricordi",
    singular: "Ricordo",
    icon: "book-heart",
    description: "\"Le nostre cose\": appuntamenti, viaggi, anniversari, luoghi, momenti.",
    titleField: "title",
    subtitleField: "happened_on",
    badgeField: "kind",
    badgeOptions: opts(MEMORY_KINDS),
    toggleField: "is_published",
    toggleLabel: "Pubblicato",
    order: [
      { column: "happened_on", ascending: false },
      { column: "position", ascending: true },
    ],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "kind", label: "Tipo", type: "select", options: opts(MEMORY_KINDS), half: true },
      { name: "happened_on", label: "Data", type: "date", half: true },
      { name: "place", label: "Luogo", type: "text" },
      { name: "body", label: "Racconto", type: "markdown" },
      { name: "media_id", label: "Foto", type: "image" },
      { name: "is_important", label: "Ricordo importante", type: "boolean", half: true },
      { name: "is_published", label: "Pubblicato", type: "boolean", half: true },
    ],
    schema: z.object({
      title: reqStr(200),
      body: str(20000).default(""),
      kind: enumOf(MEMORY_KINDS, "moment"),
      happened_on: dateOrNull,
      place: optStr(200),
      media_id: uuidOrNull,
      is_important: bool(false),
      position: int(0, 100000, 0),
      is_published: bool(true),
    }),
    exportable: true,
    copilot: { name: "memory", create: true, update: true, delete: true, list: true },
  },
  comfort_actions: {
    key: "comfort_actions",
    slug: "comfort",
    table: "comfort_actions",
    label: "Comfort actions",
    singular: "Comfort action",
    icon: "sparkles",
    description: "Le idee di \"Aiutami adesso\": respiro, grounding, sensi, movimento, distrazione…",
    titleField: "title",
    subtitleField: "text",
    badgeField: "category",
    badgeOptions: opts(COMFORT_CATEGORIES),
    toggleField: "is_active",
    toggleLabel: "Attiva",
    order: [{ column: "created_at", ascending: true }],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "text", label: "Testo", type: "textarea" },
      { name: "category", label: "Categoria", type: "select", options: opts(COMFORT_CATEGORIES), half: true },
      { name: "duration_seconds", label: "Durata (secondi)", type: "number", min: 0, max: 7200, half: true, hint: "Vuoto = nessun timer" },
      { name: "icon", label: "Icona", type: "icon" },
      { name: "media_id", label: "Immagine", type: "image" },
      { name: "sound_id", label: "Suono", type: "audio" },
      { name: "cta_label", label: "Testo del pulsante", type: "text", half: true },
      { name: "cta_action", label: "Cosa fa il pulsante", type: "action", half: true },
      { name: "cta_url", label: "Link personalizzato", type: "text", hint: "Solo se l'azione è \"Link personalizzato\"" },
      { name: "weight", label: "Probabilità (peso)", type: "weight", min: 0, max: 20, hint: "Più alto = esce più spesso. 0 = mai." },
      { name: "is_active", label: "Attiva", type: "boolean" },
    ],
    schema: z.object({
      title: reqStr(200),
      text: str(4000).default(""),
      category: enumOf(COMFORT_CATEGORIES, "practical"),
      duration_seconds: z
        .union([z.coerce.number().int().min(0).max(7200), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v === "" || v === undefined ? null : v)),
      icon,
      media_id: uuidOrNull,
      sound_id: uuidOrNull,
      cta_label: optStr(60),
      cta_action: z.enum([...APP_ACTION_KEYS] as [string, ...string[]]).default("none"),
      cta_url: safeLink,
      weight: int(0, 100, 5),
      is_active: bool(true),
    }),
    exportable: true,
    copilot: { name: "comfort_action", create: true, update: true, delete: true, list: true },
  },
  breathing_presets: {
    key: "breathing_presets",
    slug: "respirazione",
    table: "breathing_presets",
    label: "Respirazione",
    singular: "Preset di respiro",
    icon: "wind",
    description: "I ritmi di respiro: secondi per inspira / trattieni / espira, forma, foto e frasi.",
    titleField: "name",
    subtitleField: "description",
    badgeField: "visual",
    badgeOptions: BREATHING_VISUALS.map((v) => ({ value: v.value, label: v.label })),
    toggleField: "is_active",
    toggleLabel: "Attivo",
    sortable: true,
    order: [
      { column: "is_default", ascending: false },
      { column: "position", ascending: true },
    ],
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "description", label: "Descrizione", type: "text" },
      { name: "inhale_seconds", label: "Inspira (s)", type: "number", min: 1, max: 20, step: 0.5, half: true },
      { name: "hold_seconds", label: "Trattieni (s)", type: "number", min: 0, max: 30, step: 0.5, half: true },
      { name: "exhale_seconds", label: "Espira (s)", type: "number", min: 1, max: 30, step: 0.5, half: true },
      { name: "hold_after_exhale_seconds", label: "Pausa dopo (s)", type: "number", min: 0, max: 30, step: 0.5, half: true },
      { name: "rounds", label: "Numero di respiri", type: "number", min: 1, max: 200, hint: "Vuoto = libero" },
      { name: "visual", label: "Forma", type: "select", options: BREATHING_VISUALS.map((v) => ({ value: v.value, label: v.label })), half: true },
      {
        name: "photo_mode",
        label: "Foto",
        type: "select",
        half: true,
        options: [
          { value: "blur_to_clear", label: "Da sfocata a nitida" },
          { value: "fade", label: "Dissolvenza" },
          { value: "none", label: "Nessuna foto" },
        ],
      },
      { name: "show_photos", label: "Mostra foto durante il respiro", type: "boolean" },
      { name: "texts", label: "Frasi durante il respiro", type: "list", hint: "Una per ogni respiro, a rotazione" },
      { name: "audio_id", label: "Audio di sottofondo", type: "audio" },
      { name: "is_default", label: "Preset predefinito", type: "boolean", half: true },
      { name: "is_active", label: "Attivo", type: "boolean", half: true },
    ],
    schema: z.object({
      name: reqStr(120),
      description: optStr(300),
      inhale_seconds: z.coerce.number().min(1).max(20).default(4),
      hold_seconds: z.coerce.number().min(0).max(30).default(4),
      exhale_seconds: z.coerce.number().min(1).max(30).default(6),
      hold_after_exhale_seconds: z.coerce.number().min(0).max(30).default(0),
      rounds: z
        .union([z.coerce.number().int().min(1).max(200), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v === "" || v === undefined ? null : v)),
      visual: z.enum(["heart", "sphere", "flower", "orb", "star", "wave"]).default("heart"),
      show_photos: bool(true),
      photo_mode: z.enum(["blur_to_clear", "fade", "none"]).default("blur_to_clear"),
      texts: stringList(200),
      audio_id: uuidOrNull,
      is_default: bool(false),
      is_active: bool(true),
      position: int(0, 100000, 0),
    }),
    exportable: true,
    copilot: { name: "breathing_preset", create: true, update: true, delete: false, list: true },
  },
  breathing_media: {
    key: "breathing_media",
    slug: "respirazione-foto",
    table: "breathing_media",
    label: "Foto della respirazione",
    singular: "Foto della respirazione",
    icon: "image",
    description: "Foto e frasi che compaiono durante il respiro (\"Respira con me.\").",
    titleField: "text",
    toggleField: "is_active",
    toggleLabel: "Attiva",
    sortable: true,
    order: [{ column: "position", ascending: true }],
    fields: [
      { name: "media_id", label: "Foto", type: "image", required: true },
      { name: "text", label: "Frase", type: "text", placeholder: "Respira con me." },
      { name: "preset_id", label: "Solo per il preset (vuoto = tutti)", type: "select", options: [] },
      { name: "is_active", label: "Attiva", type: "boolean" },
    ],
    schema: z.object({
      media_id: z.uuid("Scegli una foto"),
      text: optStr(200),
      preset_id: uuidOrNull,
      position: int(0, 100000, 0),
      is_active: bool(true),
    }),
    exportable: false,
    copilot: false,
  },
  grounding_exercises: {
    key: "grounding_exercises",
    slug: "grounding",
    table: "grounding_exercises",
    label: "Grounding",
    singular: "Esercizio di grounding",
    icon: "footprints",
    description: "Esercizi passo-passo (incluso il 5-4-3-2-1, codice \"54321\").",
    titleField: "title",
    subtitleField: "description",
    toggleField: "is_active",
    toggleLabel: "Attivo",
    sortable: true,
    order: [{ column: "position", ascending: true }],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "slug", label: "Codice (lettere, numeri, trattini)", type: "text", required: true, hint: "\"54321\" è il 5-4-3-2-1" },
      { name: "description", label: "Descrizione", type: "text" },
      { name: "icon", label: "Icona", type: "icon" },
      { name: "steps", label: "Passi", type: "steps" },
      { name: "end_text", label: "Frase finale", type: "text", placeholder: "Sei qui. Va bene così. ♡" },
      { name: "is_active", label: "Attivo", type: "boolean" },
    ],
    schema: z.object({
      title: reqStr(120),
      slug: z
        .string()
        .trim()
        .regex(/^[a-z0-9-]{2,60}$/, "Usa solo lettere minuscole, numeri e trattini"),
      description: optStr(300),
      icon,
      steps: z.array(groundingStepSchema).min(1, "Aggiungi almeno un passo").max(12),
      end_text: optStr(200),
      is_active: bool(true),
      position: int(0, 100000, 0),
    }),
    exportable: true,
    copilot: false,
  },
  countdowns: {
    key: "countdowns",
    slug: "countdown",
    table: "countdowns",
    label: "Countdown",
    singular: "Countdown",
    icon: "hourglass",
    description: "Anniversari, compleanni, prossimo incontro, viaggi…",
    titleField: "title",
    subtitleField: "target_at",
    badgeField: "kind",
    badgeOptions: opts(COUNTDOWN_KINDS),
    toggleField: "is_published",
    toggleLabel: "Visibile",
    order: [{ column: "target_at", ascending: true }],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "kind", label: "Tipo", type: "select", options: opts(COUNTDOWN_KINDS), half: true },
      { name: "target_at", label: "Data e ora", type: "datetime", required: true, half: true },
      { name: "description", label: "Descrizione", type: "text" },
      { name: "icon", label: "Icona", type: "icon" },
      { name: "media_id", label: "Foto", type: "image" },
      { name: "recurring_yearly", label: "Si ripete ogni anno", type: "boolean", half: true },
      { name: "show_on_home", label: "Mostra in home", type: "boolean", half: true },
      { name: "is_published", label: "Visibile", type: "boolean" },
    ],
    schema: z.object({
      title: reqStr(160),
      description: optStr(300),
      kind: enumOf(COUNTDOWN_KINDS, "custom"),
      target_at: datetime,
      icon,
      media_id: uuidOrNull,
      recurring_yearly: bool(false),
      show_on_home: bool(true),
      position: int(0, 100000, 0),
      is_published: bool(true),
    }),
    exportable: true,
    copilot: { name: "countdown", create: true, update: true, delete: true, list: true },
  },
  time_capsules: {
    key: "time_capsules",
    slug: "capsule",
    table: "time_capsules",
    label: "Capsule del tempo",
    singular: "Capsula del tempo",
    icon: "alarm",
    description: "Lettere che Viola può aprire solo da una certa data in poi (il testo resta segreto fino ad allora).",
    titleField: "title",
    subtitleField: "unlock_at",
    toggleField: "is_published",
    toggleLabel: "Visibile",
    order: [{ column: "unlock_at", ascending: true }],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "unlock_at", label: "Si apre il", type: "datetime", required: true },
      { name: "teaser", label: "Anteprima (visibile prima dell'apertura)", type: "text" },
      { name: "body", label: "Lettera", type: "markdown" },
      { name: "media_id", label: "Foto", type: "image" },
      { name: "is_published", label: "Visibile", type: "boolean" },
    ],
    schema: z.object({
      title: reqStr(160),
      teaser: optStr(300),
      body: str(30000).default(""),
      media_id: uuidOrNull,
      unlock_at: datetime,
      is_published: bool(true),
    }),
    exportable: true,
    copilot: { name: "time_capsule", create: true, update: true, delete: false, list: false },
  },
  open_when_cards: {
    key: "open_when_cards",
    slug: "aprimi",
    table: "open_when_cards",
    label: "Aprimi quando…",
    singular: "Busta \"Aprimi quando\"",
    icon: "gift",
    description: "Buste da aprire nel momento giusto: sola, mi manchi, giornata terribile…",
    titleField: "title",
    subtitleField: "body",
    toggleField: "is_published",
    toggleLabel: "Pubblicata",
    sortable: true,
    order: [{ column: "position", ascending: true }],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true, placeholder: "Aprimi quando ti senti sola" },
      { name: "body", label: "Testo", type: "markdown" },
      { name: "media_id", label: "Foto", type: "image" },
      { name: "audio_id", label: "Audio", type: "audio" },
      { name: "animation", label: "Animazione", type: "select", options: opts(OPEN_WHEN_ANIMATIONS), half: true },
      { name: "cta_action", label: "Pulsante finale", type: "action", half: true },
      { name: "color", label: "Colore", type: "color", half: true },
      { name: "icon", label: "Icona", type: "icon", half: true },
      { name: "is_published", label: "Pubblicata", type: "boolean" },
    ],
    schema: z.object({
      title: reqStr(160),
      body: str(20000).default(""),
      media_id: uuidOrNull,
      audio_id: uuidOrNull,
      animation: enumOf(OPEN_WHEN_ANIMATIONS, "hearts"),
      cta_action: action,
      color: tone,
      icon,
      position: int(0, 100000, 0),
      is_published: bool(true),
    }),
    exportable: true,
    copilot: { name: "open_when", create: true, update: true, delete: true, list: true },
  },
  daily_surprises: {
    key: "daily_surprises",
    slug: "sorprese",
    table: "daily_surprises",
    label: "Una cosa per te",
    singular: "Sorpresa del giorno",
    icon: "sparkles",
    description: "La sorpresa quotidiana. Con una data: esce quel giorno. Senza data: pescata a caso (sempre la stessa per tutto il giorno).",
    titleField: "title",
    subtitleField: "body",
    badgeField: "kind",
    badgeOptions: opts(SURPRISE_KINDS),
    toggleField: "is_published",
    toggleLabel: "Pubblicata",
    order: [
      { column: "scheduled_on", ascending: true },
      { column: "created_at", ascending: true },
    ],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "kind", label: "Tipo", type: "select", options: opts(SURPRISE_KINDS), half: true },
      { name: "scheduled_on", label: "Giorno (facoltativo)", type: "date", half: true },
      { name: "body", label: "Testo", type: "markdown" },
      { name: "media_id", label: "Foto", type: "image" },
      { name: "action", label: "Pulsante", type: "action" },
      { name: "weight", label: "Probabilità (peso)", type: "weight", min: 0, max: 20 },
      { name: "is_published", label: "Pubblicata", type: "boolean" },
    ],
    schema: z.object({
      kind: enumOf(SURPRISE_KINDS, "phrase"),
      title: reqStr(160),
      body: optStr(10000),
      media_id: uuidOrNull,
      action,
      scheduled_on: dateOrNull,
      weight: int(0, 100, 5),
      is_published: bool(true),
    }),
    exportable: true,
    copilot: { name: "daily_surprise", create: true, update: true, delete: true, list: true },
  },
  home_modules: {
    key: "home_modules",
    slug: "home",
    table: "home_modules",
    label: "Home builder",
    singular: "Modulo della home",
    icon: "home",
    description: "Cosa vede Viola in home, in che ordine, con che titolo, icona e colore.",
    titleField: "title",
    subtitleField: "subtitle",
    badgeField: "type",
    badgeOptions: [
      { value: "action", label: "Card" },
      { value: "widget", label: "Widget" },
    ],
    toggleField: "is_enabled",
    toggleLabel: "Visibile",
    sortable: true,
    order: [{ column: "position", ascending: true }],
    fields: [
      {
        name: "type",
        label: "Tipo",
        type: "select",
        options: [
          { value: "action", label: "Card \"Di cosa hai bisogno?\"" },
          { value: "widget", label: "Widget" },
        ],
        half: true,
      },
      { name: "size", label: "Larghezza", type: "select", options: [{ value: "md", label: "Metà" }, { value: "lg", label: "Intera" }], half: true },
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "subtitle", label: "Descrizione", type: "text" },
      { name: "action", label: "Azione (per le card)", type: "action" },
      { name: "widget", label: "Widget", type: "select", options: opts(HOME_WIDGETS) },
      { name: "url", label: "Link personalizzato", type: "text", hint: "Solo con azione \"Link personalizzato\"" },
      { name: "icon", label: "Icona", type: "icon", half: true },
      { name: "color", label: "Colore", type: "color", half: true },
      { name: "is_enabled", label: "Visibile", type: "boolean" },
    ],
    schema: z.object({
      type: z.enum(["action", "widget"]).default("action"),
      action: z
        .union([z.enum(APP_ACTION_KEYS as [string, ...string[]]), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v ? v : null)),
      widget: z
        .union([z.enum(Object.keys(HOME_WIDGETS) as [string, ...string[]]), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v ? v : null)),
      title: reqStr(120),
      subtitle: optStr(200),
      icon,
      color: tone,
      url: safeLink,
      size: z.enum(["sm", "md", "lg"]).default("md"),
      position: int(0, 100000, 0),
      is_enabled: bool(true),
    }),
    exportable: true,
    copilot: { name: "home_module", create: true, update: true, delete: false, list: true },
  },
  phrases: {
    key: "phrases",
    slug: "frasi",
    table: "phrases",
    label: "Frasi",
    singular: "Frase",
    icon: "feather",
    description: "Frasi casuali: home, buongiorno, buonanotte, missioni, domande, roulette, abbraccio…",
    titleField: "text",
    badgeField: "kind",
    badgeOptions: opts(PHRASE_KINDS),
    toggleField: "is_active",
    toggleLabel: "Attiva",
    order: [
      { column: "kind", ascending: true },
      { column: "created_at", ascending: true },
    ],
    fields: [
      { name: "kind", label: "Dove compare", type: "select", options: opts(PHRASE_KINDS) },
      { name: "text", label: "Frase", type: "textarea", required: true },
      { name: "weight", label: "Probabilità (peso)", type: "weight", min: 0, max: 20 },
      { name: "is_active", label: "Attiva", type: "boolean" },
    ],
    schema: z.object({
      kind: enumOf(PHRASE_KINDS, "home"),
      text: reqStr(1000),
      weight: int(0, 100, 5),
      is_active: bool(true),
    }),
    exportable: true,
    copilot: { name: "phrase", create: true, update: true, delete: true, list: true },
  },
  quiz_questions: {
    key: "quiz_questions",
    slug: "quiz",
    table: "quiz_questions",
    label: "Quiz \"Quanto mi conosci?\"",
    singular: "Domanda del quiz",
    icon: "trophy",
    description: "Domande con risposte multiple. Il gioco compare quando c'è almeno una domanda attiva.",
    titleField: "question",
    toggleField: "is_active",
    toggleLabel: "Attiva",
    sortable: true,
    order: [{ column: "position", ascending: true }],
    fields: [
      { name: "question", label: "Domanda", type: "text", required: true },
      { name: "options", label: "Risposte (scegli quella giusta)", type: "options" },
      { name: "explanation", label: "Spiegazione dopo la risposta", type: "text" },
      { name: "is_active", label: "Attiva", type: "boolean" },
    ],
    schema: z.object({
      question: reqStr(300),
      options: z.array(z.string().trim().min(1, "Risposta vuota").max(160)).min(2, "Servono almeno 2 risposte").max(6),
      correct_index: z.coerce.number().int().min(0).max(5).default(0),
      explanation: optStr(400),
      position: int(0, 100000, 0),
      is_active: bool(true),
    }),
    check: (row) =>
      Array.isArray(row.options) && typeof row.correct_index === "number" && row.correct_index >= row.options.length
        ? "La risposta giusta non esiste"
        : null,
    exportable: true,
    copilot: false,
  },
  audio_items: {
    key: "audio_items",
    slug: "audio",
    table: "audio_items",
    label: "Audio",
    singular: "Audio",
    icon: "headphones",
    description: "\"La voce di Adam\": vocali, canzoni, audio per dormire.",
    titleField: "title",
    subtitleField: "description",
    badgeField: "category",
    badgeOptions: opts(AUDIO_CATEGORIES),
    toggleField: "is_published",
    toggleLabel: "Pubblicato",
    sortable: true,
    order: [{ column: "position", ascending: true }],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "media_id", label: "File audio", type: "audio", required: true },
      { name: "category", label: "Categoria", type: "select", options: opts(AUDIO_CATEGORIES) },
      { name: "description", label: "Descrizione", type: "text" },
      { name: "is_published", label: "Pubblicato", type: "boolean" },
    ],
    schema: z.object({
      title: reqStr(160),
      description: optStr(300),
      category: enumOf(AUDIO_CATEGORIES, "voice"),
      media_id: z.uuid("Scegli un file audio"),
      position: int(0, 100000, 0),
      is_published: bool(true),
    }),
    exportable: true,
    copilot: false,
  },
  ai_memory: {
    key: "ai_memory",
    slug: "ai-memoria",
    table: "ai_memory",
    label: "Memoria di Adam AI",
    singular: "Informazione",
    icon: "lightbulb",
    description: "Le sole informazioni personali che Adam AI può usare. Non inventa nulla oltre a queste.",
    titleField: "key",
    subtitleField: "value",
    badgeField: "category",
    badgeOptions: opts(AI_MEMORY_CATEGORIES),
    toggleField: "enabled",
    toggleLabel: "Attiva",
    order: [
      { column: "category", ascending: true },
      { column: "created_at", ascending: true },
    ],
    fields: [
      { name: "category", label: "Categoria", type: "select", options: opts(AI_MEMORY_CATEGORIES), half: true },
      { name: "key", label: "Argomento", type: "text", required: true, half: true, placeholder: "Il nostro posto" },
      { name: "value", label: "Informazione", type: "textarea", required: true, placeholder: "Il nostro posto del cuore è…" },
      { name: "enabled", label: "Adam AI la può usare", type: "boolean", half: true },
      { name: "visible_to_viola", label: "Viola la può vedere", type: "boolean", half: true },
    ],
    schema: z.object({
      category: enumOf(AI_MEMORY_CATEGORIES, "fact"),
      key: reqStr(200),
      value: reqStr(4000),
      enabled: bool(true),
      visible_to_viola: bool(false),
    }),
    exportable: true,
    copilot: { name: "ai_memory", create: true, update: true, delete: true, list: true },
  },
  media: {
    key: "media",
    slug: "foto",
    table: "media",
    label: "Foto e audio",
    singular: "File",
    icon: "images",
    description: "La libreria di foto e audio.",
    titleField: "title",
    subtitleField: "caption",
    toggleField: "visibility",
    order: [{ column: "created_at", ascending: false }],
    fields: [
      { name: "title", label: "Titolo", type: "text" },
      { name: "caption", label: "Didascalia", type: "textarea" },
      { name: "taken_on", label: "Data", type: "date", half: true },
      { name: "category", label: "Categoria", type: "text", half: true, suggestions: [] },
      { name: "tags", label: "Tag", type: "tags" },
      { name: "contexts", label: "Dove può comparire", type: "contexts", options: opts(MEDIA_CONTEXTS) },
      { name: "featured", label: "In evidenza", type: "boolean", half: true },
      { name: "include_in_random", label: "Nelle foto casuali", type: "boolean", half: true },
      {
        name: "visibility",
        label: "Visibilità",
        type: "select",
        options: [
          { value: "shared", label: "Condivisa con Viola" },
          { value: "private", label: "Privata (solo admin)" },
        ],
      },
    ],
    schema: z.object({
      title: optStr(200),
      caption: optStr(1000),
      taken_on: dateOrNull,
      category: optStr(60),
      tags: stringList(40, 20),
      contexts: z.array(z.enum(Object.keys(MEDIA_CONTEXTS) as [string, ...string[]])).max(10).default(["gallery"]),
      featured: bool(false),
      include_in_random: bool(true),
      breathing_enabled: bool(false),
      ai_avatar_enabled: bool(false),
      visibility: z.enum(["shared", "private"]).default("shared"),
    }),
    exportable: false,
    copilot: { name: "media", create: false, update: true, delete: true, list: true },
    noCreate: true,
  },
} satisfies Record<string, ResourceDef>;

export type ResourceKey = keyof typeof RESOURCES;
export const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];

export function getResource(key: string): ResourceDef | null {
  return Object.prototype.hasOwnProperty.call(RESOURCES, key) ? (RESOURCES[key as ResourceKey] as ResourceDef) : null;
}

export function resourceBySlug(slug: string): ResourceDef | null {
  return (Object.values(RESOURCES) as ResourceDef[]).find((r) => r.slug === slug) ?? null;
}

/**
 * Validates an update: ONLY the keys present in `input` are validated and
 * returned (zod's .partial() would re-apply defaults to missing keys and
 * silently overwrite existing values).
 */
export function parseUpdate(def: ResourceDef, input: Record<string, unknown>) {
  const shape = def.schema.shape;
  const keys = Object.keys(input).filter((k) => Object.prototype.hasOwnProperty.call(shape, k));
  const mask = Object.fromEntries(keys.map((k) => [k, true as const]));
  return def.schema.pick(mask).safeParse(input);
}

/** Default values for a new record (schema defaults). */
export function defaultsFor(def: ResourceDef): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const shape = (def.schema as z.ZodObject<z.ZodRawShape>).shape ?? {};
  for (const [k, s] of Object.entries(shape)) {
    const r = (s as z.ZodType).safeParse(undefined);
    if (r.success && r.data !== undefined) out[k] = r.data;
  }
  return out;
}
