import "server-only";
import type { FunctionDeclaration } from "@google/genai";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { SettingsMap } from "@/features/settings/schema";
import type { ChatAction } from "@/features/ai-chat/types";
import { signOne } from "@/server/media";
import { getContact } from "@/server/contact";
import { countdownParts, nextOccurrence } from "@/utils/dates";
import { pickOne, shuffle } from "@/utils/random";

const obj = (properties: Record<string, unknown> = {}, required: string[] = []) => ({ type: "object", properties, required });

export const VIOLA_TOOLS: FunctionDeclaration[] = [
  { name: "start_breathing", description: "Propone una respirazione guidata (quando è agitata, ansiosa, non riesce a dormire).", parametersJsonSchema: obj() },
  { name: "start_grounding", description: "Propone un esercizio di grounding (piedi a terra, mani, stanza).", parametersJsonSchema: obj() },
  { name: "start_panic_flow", description: "Apre il percorso 'Ho paura': una cosa alla volta, a schermo intero.", parametersJsonSchema: obj() },
  { name: "start_5_4_3_2_1", description: "Propone il gioco dei sensi 5-4-3-2-1.", parametersJsonSchema: obj() },
  {
    name: "show_random_photo",
    description: "Mostra una foto a caso di loro due o di Adam.",
    parametersJsonSchema: obj({ chi: { type: "string", enum: ["adam", "noi"], description: "adam = una foto di Adam; noi = una foto di loro due" } }),
  },
  { name: "show_random_memory", description: "Mostra un ricordo di coppia scelto da Adam.", parametersJsonSchema: obj() },
  {
    name: "show_random_dedication",
    description: "Mostra una dedica scritta da Adam.",
    parametersJsonSchema: obj({ categoria: { type: "string", enum: ["sad", "fear", "lonely", "miss_me", "smile", "love", "no_reason"] } }),
  },
  { name: "show_open_when", description: "Mostra le buste 'Aprimi quando…'.", parametersJsonSchema: obj() },
  { name: "show_surprise", description: "Apre una sorpresa a caso.", parametersJsonSchema: obj() },
  { name: "open_gallery", description: "Apre la galleria delle loro foto.", parametersJsonSchema: obj() },
  { name: "open_countdown", description: "Mostra quanto manca alla prossima data importante (es. il prossimo incontro).", parametersJsonSchema: obj() },
  { name: "start_distraction", description: "Propone un mini-gioco o un'attività per distrarsi.", parametersJsonSchema: obj() },
  {
    name: "open_whatsapp_adam",
    description: "Mostra i pulsanti per scrivere o chiamare Adam (WhatsApp / telefono / 'Ho bisogno di Adam'). Da usare anche in caso di pericolo o emergenza.",
    parametersJsonSchema: obj({ messaggio: { type: "string", description: "Testo suggerito del messaggio WhatsApp" } }),
  },
];

const GAMES = [
  { href: "/viola/giochi/cuore", title: "Trova il cuore" },
  { href: "/viola/giochi/memory", title: "Memory con le vostre foto" },
  { href: "/viola/giochi/riflessi", title: "Acchiappa i cuori" },
  { href: "/viola/giochi/roulette", title: "Roulette romantica" },
  { href: "/viola/giochi/puzzle", title: "Puzzle" },
];

export type ToolOutcome = { result: Record<string, unknown>; actions: ChatAction[] };

/** Executes an app tool for Viola. Returns data for the model + UI cards. */
export async function runViolaTool(name: string, args: Record<string, unknown>, supabase: ServerSupabase, settings: SettingsMap): Promise<ToolOutcome> {
  const link = (title: string, href: string, icon: string, subtitle?: string): ToolOutcome => ({
    result: { mostrato: title },
    actions: [{ type: "link", title, href, icon, subtitle }],
  });
  const adam = settings.general.adamName;

  switch (name) {
    case "start_breathing":
      return link("Respira con me", "/viola/calma/respira?via=1", "wind", "Un respiro alla volta");
    case "start_grounding":
      return link("Grounding", "/viola/calma/grounding", "footprints", "Piedi a terra");
    case "start_panic_flow":
      return link("Una cosa alla volta", "/viola/calma/paura", "shield-heart", "Ho paura");
    case "start_5_4_3_2_1":
      return link("5-4-3-2-1", "/viola/calma/54321", "hand", "Un gioco con i sensi");
    case "open_gallery":
      return link("Le nostre foto", "/viola/noi/foto", "images");
    case "show_open_when": {
      const { data } = await supabase.from("open_when_cards").select("title").limit(10);
      return { result: { buste: (data ?? []).map((d) => d.title) }, actions: [{ type: "link", title: "Aprimi quando…", href: "/viola/noi/aprimi", icon: "gift", subtitle: `${data?.length ?? 0} buste` }] };
    }
    case "show_surprise":
      return link("Sorprendimi ♡", "/viola/sorpresa", "gift", "Non sai cosa uscirà");
    case "start_distraction": {
      const g = pickOne(GAMES)!;
      return link(g.title, g.href, "gamepad", "Un piccolo gioco");
    }
    case "open_countdown": {
      const { data } = await supabase.from("countdowns").select("*").order("target_at");
      const now = new Date();
      const next = (data ?? []).map((c) => ({ ...c, at: nextOccurrence(c.target_at, c.recurring_yearly, now) })).filter((c) => c.at > now).sort((a, b) => +a.at - +b.at)[0];
      if (!next) return { result: { countdown: "nessuna data impostata" }, actions: [] };
      const p = countdownParts(next.at, now);
      return {
        result: { titolo: next.title, giorni: p.days, ore: p.hours },
        actions: [{ type: "link", title: next.title, subtitle: `Mancano ${p.days} giorni e ${p.hours} ore`, href: "/viola/noi/countdown", icon: "hourglass" }],
      };
    }
    case "show_random_photo": {
      const onlyAdam = args.chi === "adam";
      let q = supabase.from("media").select("*").eq("kind", "image").eq("include_in_random", true);
      if (onlyAdam) q = q.or("category.eq.adam,ai_avatar_enabled.eq.true");
      const { data } = await q.limit(200);
      const row = pickOne(data ?? []);
      if (!row) return { result: { foto: "nessuna foto disponibile" }, actions: [] };
      const m = await signOne(supabase, row);
      return {
        result: { mostrata: true, titolo: row.title, didascalia: row.caption, data: row.taken_on },
        actions: [{ type: "photo", mediaId: row.id, url: m?.url, title: row.title, caption: row.caption, date: row.taken_on }],
      };
    }
    case "show_random_memory": {
      const { data } = await supabase.from("memories").select("*").limit(200);
      const m = pickOne(data ?? []);
      if (!m) return { result: { ricordo: "nessun ricordo salvato: non inventarne" }, actions: [] };
      const img = m.media_id ? await signOne(supabase, (await supabase.from("media").select("*").eq("id", m.media_id).maybeSingle()).data) : null;
      const excerpt = m.body.slice(0, 280);
      return {
        result: { titolo: m.title, data: m.happened_on, luogo: m.place, testo: excerpt },
        actions: [{ type: "memory", id: m.id, title: m.title, excerpt, date: m.happened_on, mediaId: m.media_id, url: img?.url }],
      };
    }
    case "show_random_dedication": {
      let q = supabase.from("dedications").select("*");
      if (typeof args.categoria === "string") q = q.eq("category", args.categoria);
      let { data } = await q.limit(200);
      if (!data?.length) ({ data } = await supabase.from("dedications").select("*").limit(200));
      const d = pickOne(shuffle(data ?? []));
      if (!d) return { result: { dedica: "nessuna dedica disponibile" }, actions: [] };
      const excerpt = d.body.slice(0, 400);
      return {
        result: { titolo: d.title, mostrata: true },
        actions: [{ type: "dedication", id: d.id, title: d.title, excerpt, signature: d.signature || settings.general.signature }],
      };
    }
    case "open_whatsapp_adam": {
      const contact = getContact(settings);
      const text = typeof args.messaggio === "string" && args.messaggio.trim() ? args.messaggio.slice(0, 300) : contact.messages[0];
      const actions: ChatAction[] = [];
      if (contact.whatsappNumber) actions.push({ type: "link", title: `Scrivi ad ${adam} su WhatsApp`, subtitle: text, href: `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(text ?? "")}`, icon: "message-heart" });
      if (contact.phoneUrl) actions.push({ type: "link", title: `Chiama ${adam}`, href: contact.phoneUrl, icon: "phone" });
      actions.push({ type: "link", title: `Ho bisogno di ${adam}`, subtitle: "Gli arriva subito un avviso", href: "/viola/adam", icon: "heart-handshake" });
      return { result: { mostrato: "contatti di Adam" }, actions };
    }
    default:
      return { result: { errore: "strumento sconosciuto" }, actions: [] };
  }
}
