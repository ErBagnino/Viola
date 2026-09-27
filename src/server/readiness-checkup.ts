import "server-only";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/server/env";
import { getSettings } from "@/server/settings";
import { telegramChatId } from "@/server/notifications";
import { telegramGetMe } from "@/server/notifications/telegram";
import { isAiConfigured, listAvailableModels } from "@/server/ai/gemini";
import { modelChain } from "@/server/ai/models";
import { getReadinessFacts } from "@/server/readiness";
import type { CheckupItem } from "@/features/readiness/types";
import { occurrenceOf } from "@/utils/dates";

const quote = (titles: string[]) => titles.slice(0, 3).map((t) => `"${t}"`).join(", ") + (titles.length > 3 ? ` e altri ${titles.length - 3}` : "");

/**
 * "Controllo Vio ♡": really tries the things that can silently break —
 * Telegram, Gemini, photo storage — and looks for content mistakes Viola
 * would stumble on. Read-only: sends nothing, changes nothing.
 */
export async function runCheckupFor(adminId: string): Promise<CheckupItem[]> {
  const settings = await getSettings();
  const supabase = await createClient();
  const tz = settings.general.timezone;
  const items: CheckupItem[] = [];
  const add = (level: CheckupItem["level"], title: string, detail?: string, href?: string) => items.push({ level, title, detail, href });

  const [facts, recentMedia, memories, dedications, openWhen, countdowns, surprises, quiz] = await Promise.all([
    getReadinessFacts(adminId, settings),
    supabase.from("media").select("id, path, title").eq("kind", "image").order("created_at", { ascending: false }).limit(8),
    supabase.from("memories").select("title, media_id").eq("is_published", true).not("media_id", "is", null).limit(1000),
    supabase.from("dedications").select("title, media_id").eq("is_published", true).not("media_id", "is", null).limit(1000),
    supabase.from("open_when_cards").select("title, body, media_id").eq("is_published", true).limit(500),
    supabase.from("countdowns").select("title, target_at, recurring_yearly, show_on_home").eq("is_published", true).limit(500),
    supabase.from("daily_surprises").select("title, media_id").eq("is_published", true).not("media_id", "is", null).limit(1000),
    supabase.from("quiz_questions").select("question, options, correct_index").eq("is_active", true).limit(500),
  ]);

  // --- Database & keys ------------------------------------------------------
  if (facts.databaseUpdated) add("ok", "Database aggiornato");
  else add("error", "Il database non è aggiornato", "Esegui supabase/update.sql nel SQL Editor di Supabase.", "/admin/completa#come-aggiornare");
  if (!facts.env.serviceRole) add("error", "Manca SUPABASE_SERVICE_ROLE_KEY", "Senza, le notifiche a Viola e il \"tieni sveglio\" giornaliero non funzionano.");
  if (Boolean(publicEnv.vapidPublicKey) !== Boolean(serverEnv.vapidPrivateKey)) add("error", "Chiavi VAPID incomplete", "Servono sia NEXT_PUBLIC_VAPID_PUBLIC_KEY sia VAPID_PRIVATE_KEY.", "/admin/notifiche");

  // --- Telegram (real call, no message sent) --------------------------------
  if (serverEnv.telegramBotToken) {
    const me = await telegramGetMe();
    if (!me.ok) add("error", "Telegram non risponde", me.error, "/admin/notifiche");
    else if (!telegramChatId(settings)) add("warn", `Il bot @${me.username} funziona, ma manca il chat ID`, "Scrivi al bot e scegli la chat in Notifiche.", "/admin/notifiche");
    else add("ok", `Telegram funziona (@${me.username})`);
  } else if (!(facts.env.vapid && facts.adamPushDevices > 0)) {
    add("warn", "Nessun avviso configurato", "Se preme \"Ho bisogno di Adam\" non ti arriva niente.", "/admin/notifiche");
  }

  // --- Gemini (lists models: does not use the daily quota) -----------------
  if (settings.ai.enabled && !isAiConfigured()) add("warn", "Adam AI è accesa ma manca GEMINI_API_KEY", "Viola vedrà un messaggio gentile al posto delle risposte.", "/admin/ai");
  else if (settings.ai.enabled) {
    try {
      const available = new Set(await listAvailableModels());
      const chain = modelChain(settings, serverEnv.geminiModel, { textOnly: true });
      const usable = chain.filter((m) => available.has(m));
      const first = chain[0];
      if (!usable.length) add("error", "Nessun modello Gemini disponibile per questa chiave", `Modelli provati: ${chain.join(", ")}`, "/admin/ai");
      else if (!available.has(first)) add("warn", `Il modello "${first}" non esiste per questa chiave`, `Adam AI userà "${usable[0]}". Puoi cambiarlo in Adam AI → Modello.`, "/admin/ai");
      else add("ok", `Adam AI pronta: ${usable.length} modelli gratuiti disponibili`, `Primo: ${first}. Se finisce la quota passa da solo al successivo.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      add("error", /40[13]|API key|permission/i.test(msg) ? "La chiave Gemini non è valida" : "Gemini non risponde", "Controlla GEMINI_API_KEY su Vercel.", "/admin/ai");
    }
  }

  // --- Photos really load ----------------------------------------------------
  const sample = (recentMedia.data ?? []).filter((m) => m.path);
  if (sample.length) {
    const { data } = await supabase.storage.from("media").createSignedUrls(
      sample.map((m) => m.path),
      60,
    );
    const broken = sample.filter((m, i) => !data?.[i]?.signedUrl || data[i].error);
    if (broken.length) add("error", `${broken.length} foto recenti non si aprono`, `Il file manca nello storage: ${quote(broken.map((m) => m.title || "senza titolo"))}. Ricaricale.`, "/admin/foto");
    else add("ok", "Le foto si aprono");
  }

  // --- Content Viola would stumble on ----------------------------------------
  const privateIds = await (async () => {
    const ids = [...new Set([...(memories.data ?? []), ...(dedications.data ?? []), ...(openWhen.data ?? []), ...(surprises.data ?? [])].map((r) => r.media_id).filter(Boolean) as string[])];
    if (!ids.length) return new Set<string>();
    const { data } = await supabase.from("media").select("id").in("id", ids).eq("visibility", "private");
    return new Set((data ?? []).map((m) => m.id));
  })();
  const hidden = [...(memories.data ?? []), ...(dedications.data ?? []), ...(openWhen.data ?? []), ...(surprises.data ?? [])].filter((r) => r.media_id && privateIds.has(r.media_id));
  if (hidden.length) add("warn", `${hidden.length} contenuti usano una foto privata`, `Viola non vedrà la foto in: ${quote(hidden.map((r) => r.title))}. Rendila condivisa in Foto.`, "/admin/foto");

  const now = new Date();
  const pastOnHome = (countdowns.data ?? []).filter((c) => c.show_on_home && occurrenceOf(c.target_at, c.recurring_yearly, now, tz).past);
  if (pastOnHome.length) add("warn", "Countdown già passati", `Non si vedono più in home: ${quote(pastOnHome.map((c) => c.title))}. Aggiorna la data o archiviali.`, "/admin/countdown");

  const emptyCards = (openWhen.data ?? []).filter((c) => !c.body?.trim() && !c.media_id);
  if (emptyCards.length) add("warn", "Buste vuote", `Si aprono senza niente dentro: ${quote(emptyCards.map((c) => c.title))}`, "/admin/aprimi");

  const badQuiz = (quiz.data ?? []).filter((q) => q.options.length < 2 || q.correct_index < 0 || q.correct_index >= q.options.length);
  if (badQuiz.length) add("error", "Domande del quiz con la risposta giusta sbagliata", quote(badQuiz.map((q) => q.question)), "/admin/quiz");

  if (!items.some((i) => i.level !== "ok")) add("ok", "Nessun problema nei contenuti ♡");
  const rank = { error: 0, warn: 1, ok: 2 } as const;
  return items.sort((a, b) => rank[a.level] - rank[b.level]);
}
