import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleStatus } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";
import { serverEnv } from "@/server/env";
import { isAiConfigured } from "@/server/ai/gemini";
import { telegramChatId } from "@/server/notifications";
import type { SettingsMap } from "@/features/settings/schema";
import { MEMORY_PAIRS } from "@/features/content/constants";
import { evaluateTasks, SEED_TITLES, untouchedSeed, type ManualState, type ReadinessFacts } from "@/features/readiness/tasks";
import type { ReadinessSummary, UsageRow } from "@/features/readiness/types";
import { occurrenceOf } from "@/utils/dates";

/**
 * Everything the checklist needs, in one parallel batch, read with Adam's own
 * session (RLS: the admin sees all content). Only Viola's push devices are
 * counted with the service role (subscriptions are private to their owner):
 * a number, never the data.
 */
export async function getReadinessFacts(adminId: string, settings?: SettingsMap): Promise<ReadinessFacts> {
  const s = settings ?? (await getSettings());
  const supabase = await createClient();
  const serviceStatus = await serviceRoleStatus();
  const service = serviceStatus === "ok" ? createAdminClient() : null;
  const [media, memories, dedications, openWhen, countdowns, audio, aiMemory, quiz, phrases, breathingMedia, settingRows, testEvents, conversations, manual, hearts, profiles, subs] =
    await Promise.all([
      supabase.from("media").select("id, kind, visibility, contexts, include_in_random, breathing_enabled, ai_avatar_enabled, category, title").limit(5000),
      supabase.from("memories").select("id, is_published, media_id").limit(5000),
      supabase.from("dedications").select("id, title, is_published, category, created_at, updated_at").limit(5000),
      supabase.from("open_when_cards").select("id, title, is_published, created_at, updated_at").limit(1000),
      supabase.from("countdowns").select("id, title, kind, target_at, recurring_yearly, is_published").limit(500),
      supabase.from("audio_items").select("id, is_published").limit(1000),
      supabase.from("ai_memory").select("id").eq("enabled", true).limit(1000),
      supabase.from("quiz_questions").select("id, is_active, options, correct_index").limit(1000),
      supabase.from("phrases").select("kind").eq("is_active", true).in("kind", ["roulette", "question"]).limit(5000),
      supabase.from("breathing_media").select("id").eq("is_active", true).limit(1000),
      supabase.from("app_settings").select("key"),
      supabase.from("notification_events").select("id").eq("kind", "test").eq("status", "sent").limit(1),
      supabase.from("ai_conversations").select("mode").eq("user_id", adminId).eq("scope", "viola").limit(500),
      supabase.from("readiness_checks").select("task_id, state, done_at"),
      supabase.from("hearts").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id, role"),
      supabase.from("notification_subscriptions").select("user_id").eq("user_id", adminId),
    ]);

  const violaIds = (profiles.data ?? []).filter((p) => p.role === "user").map((p) => p.id);
  let violaDevices: number | null = null;
  if (service && violaIds.length) {
    const { count } = await service.from("notification_subscriptions").select("id", { count: "exact", head: true }).in("user_id", violaIds);
    violaDevices = count ?? 0;
  } else if (service) violaDevices = 0;

  const shared = (media.data ?? []).filter((x) => x.kind === "image" && x.visibility === "shared");
  const inContext = (ctx: string) => shared.filter((x) => (x.contexts ?? []).includes(ctx)).length;
  const now = new Date();
  const tz = s.general.timezone;
  const cds = (countdowns.data ?? []).filter((c) => c.is_published);
  const meeting = cds
    .filter((c) => c.kind === "meeting")
    .map((c) => ({ c, occ: occurrenceOf(c.target_at, c.recurring_yearly, now, tz) }))
    .filter((x) => !x.occ.past || x.occ.isToday)
    .sort((a, b) => +a.occ.at - +b.occ.at)[0];
  const pubDed = (dedications.data ?? []).filter((d) => d.is_published);
  const seedDed = new Set(untouchedSeed(dedications.data ?? [], SEED_TITLES.dedications).map((d) => d.id));
  const ownDed = pubDed.filter((d) => !seedDed.has(d.id));
  const pubOpen = (openWhen.data ?? []).filter((d) => d.is_published);
  const seedOpen = new Set(untouchedSeed(openWhen.data ?? [], SEED_TITLES.open_when_cards).map((d) => d.id));
  const pubMem = (memories.data ?? []).filter((x) => x.is_published);
  const avatarId = s.ai_profile.avatarMediaId;
  const manualRows = (manual.data ?? []) as { task_id: string; state: ManualState["state"]; done_at: string }[];

  return {
    settings: s,
    savedSettings: new Set((settingRows.data ?? []).map((r) => r.key)),
    env: {
      ai: isAiConfigured(),
      telegramToken: Boolean(serverEnv.telegramBotToken),
      telegramChat: Boolean(telegramChatId(s)),
      vapid: Boolean(publicEnv.vapidPublicKey && serverEnv.vapidPrivateKey),
      siteUrl: Boolean(serverEnv.siteUrl),
      cronSecret: Boolean(serverEnv.cronSecret),
      serviceRole: serviceStatus,
    },
    // the newest tables exist only after supabase/update.sql
    databaseUpdated: !manual.error && !hearts.error,
    contact: { whatsapp: Boolean(getContact(s).whatsappNumber) },
    viola: { accounts: profiles.error ? null : violaIds.length, pushDevices: violaDevices },
    adamPushDevices: (subs.data ?? []).length,
    alertsTested: (testEvents.data ?? []).length > 0,
    photos: {
      gallery: inContext("gallery"),
      random: shared.filter((x) => x.include_in_random).length,
      titledRandom: shared.filter((x) => x.include_in_random && x.title).length,
      adam: shared.filter((x) => x.category === "adam" || x.ai_avatar_enabled).length,
      breathing: shared.filter((x) => x.breathing_enabled).length + (breathingMedia.data ?? []).length,
      home: inContext("home"),
      surprises: inContext("surprises"),
      avatar: Boolean(avatarId && (media.data ?? []).some((x) => x.id === avatarId)),
    },
    audio: (audio.data ?? []).filter((x) => x.is_published).length,
    memories: { published: pubMem.length, withPhoto: pubMem.filter((x) => x.media_id).length },
    dedications: {
      personal: ownDed.length,
      byCategory: ownDed.reduce<Record<string, number>>((acc, d) => ((acc[d.category] = (acc[d.category] ?? 0) + 1), acc), {}),
    },
    openWhen: { published: pubOpen.length, untouchedSeed: pubOpen.filter((d) => seedOpen.has(d.id)).length },
    countdowns: {
      meeting: meeting ? { title: meeting.c.title, at: meeting.occ.at.toISOString(), today: meeting.occ.isToday } : null,
      anniversary: cds.some((c) => c.kind === "anniversary"),
      birthday: cds.some((c) => c.kind === "birthday"),
    },
    aiMemory: (aiMemory.data ?? []).length,
    aiModesTested: new Set((conversations.data ?? []).map((c) => c.mode)),
    quizActive: (quiz.data ?? []).filter((q) => q.is_active && q.options.length >= 2 && q.correct_index >= 0 && q.correct_index < q.options.length).length,
    phrases: {
      roulette: (phrases.data ?? []).filter((p) => p.kind === "roulette").length,
      question: (phrases.data ?? []).filter((p) => p.kind === "question").length,
    },
    manual: new Map(manualRows.map((r) => [r.task_id, { state: r.state, doneAt: r.done_at }])),
    memoryPairs: MEMORY_PAIRS,
  };
}

export async function getReadiness(adminId: string, settings?: SettingsMap): Promise<{ summary: ReadinessSummary; facts: ReadinessFacts }> {
  const facts = await getReadinessFacts(adminId, settings);
  return { summary: evaluateTasks(facts), facts };
}

const foto = (n: number) => (n === 1 ? "1 foto" : `${n} foto`);

/** "Indovina il ricordo" plays with memories that have a photo, or else with titled random photos. */
function guessRow(f: ReadinessFacts): UsageRow {
  const fromMemories = f.memories.withPhoto >= 3;
  const ok = fromMemories || f.photos.titledRandom >= 3;
  return {
    label: "Indovina il ricordo",
    state: ok ? "ready" : "todo",
    detail: fromMemories ? `${f.memories.withPhoto} ricordi con foto` : ok ? `usa ${f.photos.titledRandom} foto con titolo · meglio ricordi con foto` : "servono 3 ricordi con foto",
    href: "/admin/ricordi",
  };
}

/** Where the app uses photos, and whether each place has enough. */
export function photoUsage(f: ReadinessFacts): UsageRow[] {
  const need = (have: number, want: number, optional = false) => (have >= want ? "ready" : optional ? "optional" : "todo");
  return [
    { label: "Galleria (Noi)", state: need(f.photos.gallery, 10), detail: f.photos.gallery >= 10 ? foto(f.photos.gallery) : `${foto(f.photos.gallery)} · servono almeno 10`, href: "/admin/foto" },
    {
      label: "Memory e puzzle",
      state: need(f.photos.random, f.memoryPairs),
      detail: f.photos.random >= f.memoryPairs ? foto(f.photos.random) : `${foto(f.photos.random)} · per il Memory ne servono ${f.memoryPairs} con "Può uscire a caso"`,
      href: "/admin/foto",
    },
    guessRow(f),
    { label: "Voglio vedere Adam · abbraccio", state: need(f.photos.adam, 3), detail: `${foto(f.photos.adam)} di te${f.photos.adam < 3 ? " · ne servono 3" : ""}`, href: "/admin/foto" },
    { label: "Avatar di Adam AI", state: f.photos.avatar ? "ready" : "todo", detail: f.photos.avatar ? "scelto" : "manca", href: "/admin/ai" },
    { label: "Respirazione", state: need(f.photos.breathing, 3, true), detail: f.photos.breathing ? foto(f.photos.breathing) : "facoltativo · senza foto si vede solo la forma", href: "/admin/foto" },
    { label: "Buongiorno", state: need(f.photos.home, 1, true), detail: f.photos.home ? foto(f.photos.home) : "facoltativo", href: "/admin/foto" },
    { label: "Sorprendimi", state: need(f.photos.surprises, 2, true), detail: f.photos.surprises ? foto(f.photos.surprises) : "facoltativo", href: "/admin/foto" },
  ];
}

/** Can every game be played with their own content? */
export function gameReadiness(f: ReadinessFacts): UsageRow[] {
  return [
    {
      label: "Memory",
      state: f.photos.random >= f.memoryPairs ? "ready" : "todo",
      detail: f.photos.random >= f.memoryPairs ? `${f.memoryPairs} coppie con le vostre foto` : `${f.photos.random} foto su ${f.memoryPairs}: le altre carte usano emoji`,
      href: "/admin/foto",
    },
    { label: "Puzzle", state: f.photos.random >= 1 ? "ready" : "todo", detail: f.photos.random ? "usa una vostra foto a caso" : "senza foto usa un gradiente", href: "/admin/foto" },
    guessRow(f),
    { label: "Quanto mi conosci?", state: f.quizActive >= 3 ? "ready" : "todo", detail: f.quizActive ? `${f.quizActive} domande attive` : "nessuna domanda attiva: il gioco è nascosto", href: "/admin/quiz" },
    { label: "Roulette romantica", state: f.phrases.roulette >= 4 ? "ready" : "todo", detail: `${f.phrases.roulette} spicchi`, href: "/admin/frasi" },
    { label: "Domande per conoscerci", state: f.phrases.question >= 5 ? "ready" : "optional", detail: `${f.phrases.question} domande`, href: "/admin/frasi" },
    { label: "Trova il cuore · Acchiappa i cuori", state: "ready", detail: "non servono contenuti", href: "/viola/giochi" },
  ];
}
