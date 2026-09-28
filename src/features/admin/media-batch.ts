// Batch photo editing — the fields that can be changed on many photos at
// once, their validation and how a change is described in words. Shared by
// the photo manager (browser) and the server actions.
//
// A patch contains ONLY the fields Adam chose to change: a missing key means
// "non modificare" and that field is left exactly as it is on every photo.
import { z } from "@/lib/zod-it";
import { MEDIA_CONTEXTS, PHOTO_FOCUS } from "@/features/content/constants";

export const MAX_BATCH = 1000;
/** The photo manager shows at most this many files (newest first). */
export const LIBRARY_LIMIT = 1000;

const text = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .transform((v) => (v ? v : null));
const tagList = z.array(z.string().trim().min(1).max(40)).min(1).max(20);
const contextList = z.array(z.enum(Object.keys(MEDIA_CONTEXTS) as [string, ...string[]])).min(1).max(10);

export const batchPatchSchema = z
  .object({
    category: text(60),
    taken_on: z.union([z.iso.date(), z.null()]),
    place: text(120),
    caption: text(1000),
    visibility: z.enum(["shared", "private"]),
    focus: z.enum(Object.keys(PHOTO_FOCUS) as [string, ...string[]]),
    featured: z.boolean(),
    include_in_random: z.boolean(),
    tags_add: tagList,
    tags_remove: tagList,
    contexts_add: contextList,
    contexts_remove: contextList,
  })
  .partial()
  .strict()
  .refine((p) => Object.keys(p).length > 0, "Scegli almeno una cosa da modificare")
  .refine((p) => !(p.tags_add ?? []).some((t) => (p.tags_remove ?? []).includes(t)), "Lo stesso tag non può essere aggiunto e tolto")
  .refine((p) => !(p.contexts_add ?? []).some((c) => (p.contexts_remove ?? []).includes(c)), "Lo stesso posto non può essere aggiunto e tolto");

export type BatchPatch = z.infer<typeof batchPatchSchema>;

export const batchIdsSchema = z
  .array(z.uuid())
  .min(1, "Seleziona almeno una foto")
  .max(MAX_BATCH, `Al massimo ${MAX_BATCH} foto alla volta`)
  .transform((ids) => [...new Set(ids)]);

/** Field names, as Adam reads them. */
export const BATCH_FIELD_LABELS: Record<keyof BatchPatch, string> = {
  category: "Categoria",
  taken_on: "Data",
  place: "Luogo",
  caption: "Didascalia",
  visibility: "Visibilità",
  focus: "Posizione del soggetto",
  featured: "In evidenza",
  include_in_random: "Nelle foto casuali",
  tags_add: "Aggiungi tag",
  tags_remove: "Togli tag",
  contexts_add: "Fai comparire in",
  contexts_remove: "Togli da",
};

const formatDay = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** "Categoria → Noi", one line per changed field, for the confirmation. */
export function describePatch(patch: BatchPatch): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const key of Object.keys(BATCH_FIELD_LABELS) as (keyof BatchPatch)[]) {
    if (!(key in patch)) continue;
    const v = patch[key];
    let value: string;
    if (v === null || v === "") value = "vuoto (lo tolgo)";
    else if (key === "taken_on") value = formatDay(String(v));
    else if (key === "visibility") value = v === "shared" ? "Condivisa con Viola" : "Privata (solo tu)";
    else if (key === "focus") value = PHOTO_FOCUS[String(v)] ?? String(v);
    else if (typeof v === "boolean") value = v ? "Sì" : "No";
    else if (Array.isArray(v)) value = key.startsWith("contexts") ? v.map((c) => MEDIA_CONTEXTS[c] ?? c).join(", ") : v.join(", ");
    else value = String(v);
    out.push({ label: BATCH_FIELD_LABELS[key], value });
  }
  return out;
}

const SENTENCE_NAMES: Partial<Record<keyof BatchPatch, string>> = {
  category: "la categoria",
  taken_on: "la data",
  place: "il luogo",
  caption: "la didascalia",
  visibility: "la visibilità",
  focus: "la posizione del soggetto",
  featured: "\"in evidenza\"",
  include_in_random: "\"nelle foto casuali\"",
  tags_add: "i tag",
  tags_remove: "i tag",
  contexts_add: "dove compaiono",
  contexts_remove: "dove compaiono",
};

/** "Hai modificato la categoria e il luogo di 12 foto" (for the log). */
export function batchSentence(fields: string[], count: number) {
  const names = [...new Set(fields.map((f) => SENTENCE_NAMES[f as keyof BatchPatch]).filter(Boolean))] as string[];
  const what = names.length <= 1 ? (names[0] ?? "i dettagli") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
  return `Hai modificato ${what} di ${count === 1 ? "1 foto" : `${count} foto`}`;
}

/** The previous values worth keeping for "Annulla": only the fields the patch touched. */
export function snapshotKeys(patch: BatchPatch): string[] {
  const keys = new Set<string>();
  for (const k of Object.keys(patch)) {
    if (k === "tags_add" || k === "tags_remove") keys.add("tags");
    else if (k === "contexts_add" || k === "contexts_remove") ["contexts", "breathing_enabled", "ai_avatar_enabled"].forEach((x) => keys.add(x));
    else keys.add(k);
  }
  return [...keys];
}
