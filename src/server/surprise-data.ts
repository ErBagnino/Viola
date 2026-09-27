import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signMedia } from "@/server/media";
import { getComfortItems } from "@/server/comfort-data";
import { getNextCountdown, randomPhrase } from "@/server/viola-data";
import { APP_ACTIONS } from "@/features/actions/registry";
import type { SurpriseItem } from "@/features/surprise/surprise-box";
import { pickOne, shuffle } from "@/utils/random";
import { countdownParts } from "@/utils/dates";

const GAMES = ["game_heart", "game_memory", "game_puzzle", "game_reaction", "game_slider", "game_roulette", "game_questions"] as const;

/** A shuffled bag of surprises of different kinds. */
export async function getSurprises(): Promise<SurpriseItem[]> {
  const supabase = await createClient();
  const daAdam = await randomPhrase("da_adam", "Adam ha preparato questa sorpresa.");
  const [{ data: ded }, { data: mem }, { data: photos }, { data: ow }, comfort, countdown] = await Promise.all([
    supabase.from("dedications").select("id, title, body").limit(100),
    supabase.from("memories").select("id, title, body, media_id").limit(100),
    supabase.from("media").select("*").eq("kind", "image").contains("contexts", ["surprises"]).limit(200),
    supabase.from("open_when_cards").select("id, title").limit(50),
    getComfortItems(),
    getNextCountdown(),
  ]);
  const out: SurpriseItem[] = [];

  for (const d of shuffle(ded ?? []).slice(0, 2)) {
    out.push({ type: "dedication", eyebrow: daAdam, title: d.title, text: d.body });
  }
  const photoPicks = await signMedia(supabase, shuffle(photos ?? []).slice(0, 2));
  for (const p of photoPicks) {
    out.push({ type: "photo", eyebrow: "Una foto di noi ♡", title: p.title || "Noi", text: p.caption, imageUrl: p.url, href: "/viola/noi/foto", ctaLabel: "Tutte le foto" });
  }
  const m = pickOne(mem ?? []);
  if (m) out.push({ type: "memory", eyebrow: "Ti ricordi?", title: m.title, text: m.body, href: "/viola/noi/ricordi", ctaLabel: "Le nostre cose" });
  const game = pickOne(GAMES)!;
  out.push({ type: "game", eyebrow: "Giochiamo?", title: APP_ACTIONS[game].label, text: "Un piccolo gioco solo per te.", href: APP_ACTIONS[game].href, ctaLabel: "Gioca" });
  const ex = pickOne(comfort);
  if (ex) out.push({ type: "exercise", eyebrow: "Un momento per te", title: ex.title, text: ex.text, href: ex.ctaHref, ctaLabel: ex.ctaLabel ?? "Andiamo" });
  if (countdown) {
    const c = countdownParts(countdown.target_at);
    if (!c.done) out.push({ type: "countdown", eyebrow: "Manca poco…", title: countdown.title, text: `Mancano **${c.days} giorni** e ${c.hours} ore.`, href: "/viola/noi/countdown", ctaLabel: "Vedi il countdown" });
  }
  const card = pickOne(ow ?? []);
  if (card) out.push({ type: "open_when", eyebrow: "Una busta per te", title: card.title, text: "C'è una busta che ti aspetta.", href: "/viola/noi/aprimi", ctaLabel: "Aprila" });
  if (!out.length) out.push({ type: "phrase", eyebrow: daAdam, title: "Sei la mia persona preferita.", text: "Anche oggi. Soprattutto oggi." });
  return out;
}
