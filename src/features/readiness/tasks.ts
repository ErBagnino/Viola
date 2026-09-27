// "Completa Vio ♡" — the checklist. Tasks are defined here, in code; their
// state is DERIVED from the real data (facts). The database only remembers
// what cannot be measured: manual ticks ("Fatto") and "Non mi serve".
import type { SettingsMap } from "@/features/settings/schema";
import { DEDICATION_CATEGORIES } from "@/features/content/constants";
import { PRIORITY_META, type Priority, type ReadinessLevel, type ReadinessSummary, type TaskCategory, type TaskResult } from "./types";

export type ManualState = { state: "done" | "skipped"; doneAt: string };

export type ReadinessFacts = {
  settings: SettingsMap;
  /** app_settings keys Adam has saved at least once */
  savedSettings: Set<string>;
  env: { ai: boolean; telegramToken: boolean; telegramChat: boolean; vapid: boolean; siteUrl: boolean; cronSecret: boolean; serviceRole: "ok" | "missing" | "invalid" };
  /** supabase/update.sql applied (newest tables exist) */
  databaseUpdated: boolean;
  contact: { whatsapp: boolean };
  viola: { accounts: number | null; pushDevices: number | null };
  adamPushDevices: number;
  /** a test notification was delivered at least once */
  alertsTested: boolean;
  photos: { gallery: number; random: number; titledRandom: number; adam: number; breathing: number; home: number; surprises: number; avatar: boolean };
  audio: number;
  memories: { published: number; withPhoto: number };
  dedications: { personal: number; byCategory: Record<string, number> };
  openWhen: { published: number; untouchedSeed: number };
  countdowns: { meeting: { title: string; at: string; today: boolean } | null; anniversary: boolean; birthday: boolean };
  aiMemory: number;
  aiModesTested: Set<string>;
  quizActive: number;
  phrases: { roulette: number; question: number };
  manual: Map<string, ManualState>;
  memoryPairs: number;
};

type Eval = { done: boolean; detail?: string | null; progress?: { value: number; target: number } | null };

export type TaskDef = {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: Priority;
  href: string;
  cta?: string;
  /** manual tasks cannot be measured: Adam ticks them */
  manual?: boolean;
  /** "Non mi serve" allowed (never for the safety-critical essentials) */
  skippable?: boolean;
  check?: (f: ReadinessFacts) => Eval;
};

const atLeast = (value: number, target: number, what: (missing: number) => string): Eval => ({
  done: value >= target,
  progress: { value: Math.min(value, target), target },
  detail: value >= target ? `${value} ✓` : what(target - value),
});
const altre = (n: number, one: string, many: string) => (n === 1 ? `serve ancora 1 ${one}` : `servono ancora ${n} ${many}`);

export const TASKS: TaskDef[] = [
  // --- App -----------------------------------------------------------------
  {
    id: "db-update",
    title: "Aggiorna il database",
    description: "Apri Supabase → SQL Editor, incolla il file supabase/update.sql e premi Run. Si può rifare senza rischi.",
    category: "App",
    priority: "essential",
    href: "/admin/completa#come-aggiornare",
    cta: "Come si fa",
    check: (f) => ({ done: f.databaseUpdated, detail: f.databaseUpdated ? "aggiornato" : "mancano le ultime novità (cuori, lista \"Completa\")" }),
  },
  {
    id: "service-key",
    title: "La chiave segreta di Supabase",
    description: "SUPABASE_SERVICE_ROLE_KEY su Vercel: serve per le notifiche a Viola, le impostazioni e il \"tieni sveglio\". Deve essere la Secret key (sb_secret_…) dello stesso progetto.",
    category: "App",
    priority: "essential",
    href: "/admin/completa#chiave-segreta",
    cta: "Come si fa",
    check: (f) => ({
      done: f.env.serviceRole === "ok",
      detail: f.env.serviceRole === "ok" ? "funziona" : f.env.serviceRole === "missing" ? "manca su Vercel" : "c'è, ma non funziona: forse è la chiave sbagliata",
    }),
  },
  {
    id: "viola-account",
    title: "L'account di Viola",
    description: "Crea il suo accesso in Supabase (Authentication → Users) e dagli il ruolo \"user\": è lei che userà l'app.",
    category: "App",
    priority: "essential",
    href: "/admin/completa#account-viola",
    cta: "Come si fa",
    check: (f) =>
      f.viola.accounts === null
        ? { done: false, detail: "non riesco a leggere i profili" }
        : { done: f.viola.accounts > 0, detail: f.viola.accounts > 0 ? "creato" : "nessun account con ruolo user" },
  },
  // --- Contatti -------------------------------------------------------------
  {
    id: "whatsapp",
    title: "Il tuo numero WhatsApp",
    description: "Serve per \"Scrivi ad Adam\", per chiamarti e per il kit che funziona anche senza internet.",
    category: "Contatti",
    priority: "essential",
    href: "/admin/impostazioni#s-contact",
    check: (f) => ({ done: f.contact.whatsapp, detail: f.contact.whatsapp ? "impostato" : "manca" }),
  },
  {
    id: "alerts",
    title: "Ricevi gli avvisi quando ha bisogno di te",
    description: "Quando preme \"Ho bisogno di Adam\" deve arrivarti subito qualcosa: Telegram (consigliato) o le notifiche sul tuo telefono.",
    category: "Contatti",
    priority: "essential",
    href: "/admin/notifiche",
    check: (f) => {
      const tg = f.env.telegramToken && f.env.telegramChat;
      const push = f.env.vapid && f.adamPushDevices > 0;
      return {
        done: tg || push,
        detail: tg && push ? "Telegram e notifiche push" : tg ? "Telegram" : push ? "notifiche push" : f.env.telegramToken ? "Telegram: manca il chat ID" : "nessun canale attivo",
      };
    },
  },
  {
    id: "alerts-test",
    title: "Prova un avviso",
    description: "Premi \"Invia notifica di prova\" e controlla che ti arrivi davvero.",
    category: "Contatti",
    priority: "recommended",
    href: "/admin/notifiche",
    cta: "Prova",
    skippable: true,
    check: (f) => ({ done: f.alertsTested, detail: null }),
  },
  {
    id: "telegram",
    title: "Collega Telegram",
    description: "È il canale più affidabile: ti avvisa anche con il telefono in tasca. Gratis.",
    category: "Contatti",
    priority: "recommended",
    href: "/admin/notifiche",
    skippable: true,
    check: (f) => ({
      done: f.env.telegramToken && f.env.telegramChat,
      detail: !f.env.telegramToken ? "manca TELEGRAM_BOT_TOKEN" : !f.env.telegramChat ? "manca il chat ID" : "collegato",
    }),
  },
  {
    id: "push-viola",
    title: "Notifiche sul telefono di Viola",
    description: "Così riceve le tue risposte e i tuoi cuori. Si attivano dal suo telefono, in Altro → Notifiche.",
    category: "Contatti",
    priority: "optional",
    href: "/admin/notifiche",
    cta: "Vedi",
    skippable: true,
    check: (f) =>
      !f.env.vapid
        ? { done: false, detail: "prima servono le chiavi VAPID" }
        : f.viola.pushDevices === null
          ? { done: false, detail: "non posso verificarlo finché la chiave segreta di Supabase non funziona" }
          : { done: f.viola.pushDevices > 0, detail: f.viola.pushDevices > 0 ? `${f.viola.pushDevices} dispositivo/i` : "non ancora attivate" },
  },
  // --- Coppia ---------------------------------------------------------------
  {
    id: "next-meeting",
    title: "Il prossimo incontro",
    description: "Aggiungi quando vi rivedrete: in home vede il conto alla rovescia. Quando la data passa, torna qui da fare.",
    category: "Coppia",
    priority: "essential",
    href: "/admin/countdown?nuovo=meeting",
    cta: "Aggiungi",
    check: (f) => ({
      done: Boolean(f.countdowns.meeting),
      detail: f.countdowns.meeting ? (f.countdowns.meeting.today ? `${f.countdowns.meeting.title}: è oggi ♡` : f.countdowns.meeting.title) : "nessun incontro in programma",
    }),
  },
  {
    id: "together-since",
    title: "Da quando state insieme",
    description: "Mostra \"Insieme da N giorni ♡\" nella pagina Noi.",
    category: "Coppia",
    priority: "recommended",
    href: "/admin/impostazioni#s-general",
    skippable: true,
    check: (f) => ({ done: Boolean(f.settings.general.togetherSince), detail: f.settings.general.togetherSince || "manca la data" }),
  },
  {
    id: "birthday",
    title: "Il compleanno di Viola",
    description: "Un conto alla rovescia che si ripete ogni anno. Il giorno giusto la home si fa festa.",
    category: "Coppia",
    priority: "recommended",
    href: "/admin/countdown?nuovo=birthday",
    cta: "Aggiungi",
    skippable: true,
    check: (f) => ({ done: f.countdowns.birthday, detail: null }),
  },
  {
    id: "anniversary",
    title: "Il vostro anniversario",
    description: "Anche questo si ripete ogni anno ♡",
    category: "Coppia",
    priority: "optional",
    href: "/admin/countdown?nuovo=anniversary",
    cta: "Aggiungi",
    skippable: true,
    check: (f) => ({ done: f.countdowns.anniversary, detail: null }),
  },
  // --- Foto -----------------------------------------------------------------
  {
    id: "gallery",
    title: "Le vostre foto",
    description: "La galleria è il cuore di Noi: almeno 10 foto condivise.",
    category: "Foto",
    priority: "essential",
    href: "/admin/foto",
    cta: "Carica",
    check: (f) => atLeast(f.photos.gallery, 10, (n) => altre(n, "foto", "foto")),
  },
  {
    id: "random-photos",
    title: "Foto per Memory e Puzzle",
    description: "Le foto con \"Può uscire a caso\" diventano carte del Memory e pezzi del puzzle.",
    category: "Foto",
    priority: "recommended",
    href: "/admin/foto",
    skippable: true,
    check: (f) => atLeast(f.photos.random, f.memoryPairs, (n) => `${altre(n, "foto", "foto")} (le altre carte usano emoji)`),
  },
  {
    id: "adam-photos",
    title: "Foto di te",
    description: "Per \"Voglio vedere Adam\" e l'abbraccio a distanza: categoria \"Adam\".",
    category: "Foto",
    priority: "recommended",
    href: "/admin/foto",
    skippable: true,
    check: (f) => atLeast(f.photos.adam, 3, (n) => altre(n, "foto", "foto")),
  },
  {
    id: "avatar",
    title: "La foto di Adam AI",
    description: "L'avatar che vede quando parla con Adam AI.",
    category: "Foto",
    priority: "recommended",
    href: "/admin/ai",
    skippable: true,
    check: (f) => ({ done: f.photos.avatar, detail: f.photos.avatar ? "scelta" : "manca" }),
  },
  {
    id: "breathing-photos",
    title: "Foto per la respirazione",
    description: "Durante la respirazione una vostra foto si schiarisce piano piano.",
    category: "Foto",
    priority: "optional",
    href: "/admin/foto",
    skippable: true,
    check: (f) => atLeast(f.photos.breathing, 3, (n) => altre(n, "foto", "foto")),
  },
  {
    id: "home-photo",
    title: "Una foto per il buongiorno",
    description: "Contesto \"Home\": appare la mattina.",
    category: "Foto",
    priority: "optional",
    href: "/admin/foto",
    skippable: true,
    check: (f) => atLeast(f.photos.home, 1, () => "nessuna"),
  },
  // --- Ricordi --------------------------------------------------------------
  {
    id: "first-memory",
    title: "Il primo ricordo",
    description: "Un momento vostro, con la data e (se c'è) una foto.",
    category: "Ricordi",
    priority: "essential",
    href: "/admin/ricordi?nuovo=1",
    cta: "Scrivi",
    check: (f) => ({ done: f.memories.published > 0, detail: f.memories.published ? `${f.memories.published} pubblicati` : "ancora nessuno" }),
  },
  {
    id: "more-memories",
    title: "Una piccola storia di voi",
    description: "Almeno 5 ricordi: la linea del tempo in Noi prende vita.",
    category: "Ricordi",
    priority: "recommended",
    href: "/admin/ricordi?nuovo=1",
    cta: "Scrivi",
    skippable: true,
    check: (f) => atLeast(f.memories.published, 5, (n) => altre(n, "ricordo", "ricordi")),
  },
  {
    id: "memory-photos",
    title: "Ricordi con foto",
    description: "Servono per il gioco \"Indovina il ricordo\".",
    category: "Ricordi",
    priority: "recommended",
    href: "/admin/ricordi",
    skippable: true,
    check: (f) => atLeast(f.memories.withPhoto, 3, (n) => altre(n, "ricordo con foto", "ricordi con foto")),
  },
  // --- Dediche / Buste / Audio ---------------------------------------------
  {
    id: "dedications",
    title: "Le tue dediche",
    description: "Scritte da te, non quelle di esempio. Le legge quando ne ha bisogno.",
    category: "Dediche",
    priority: "recommended",
    href: "/admin/dediche?nuovo=1",
    cta: "Scrivi",
    skippable: true,
    check: (f) => atLeast(f.dedications.personal, 5, (n) => altre(n, "dedica tua", "dediche tue")),
  },
  {
    id: "dedication-moments",
    title: "Una dedica per i momenti difficili",
    description: "Almeno una per: triste, paura, quando le manchi, bisogno di amore.",
    category: "Dediche",
    priority: "recommended",
    href: "/admin/dediche?nuovo=1",
    cta: "Scrivi",
    skippable: true,
    check: (f) => {
      const missing = ["sad", "fear", "miss_me", "love"].filter((c) => !f.dedications.byCategory[c]);
      return {
        done: missing.length === 0,
        progress: { value: 4 - missing.length, target: 4 },
        detail: missing.length ? `mancano: ${missing.map((c) => DEDICATION_CATEGORIES[c].toLowerCase()).join(", ")}` : "tutte ✓",
      };
    },
  },
  {
    id: "open-when",
    title: "Riscrivi le buste \"Aprimi quando…\"",
    description: "Quelle iniziali sono esempi: cambiale con parole tue.",
    category: "Buste",
    priority: "recommended",
    href: "/admin/aprimi",
    cta: "Riscrivi",
    skippable: true,
    check: (f) => ({
      done: f.openWhen.published >= 3 && f.openWhen.untouchedSeed === 0,
      detail: f.openWhen.published < 3 ? `${f.openWhen.published} buste pubblicate · ne servono 3` : f.openWhen.untouchedSeed ? `${f.openWhen.untouchedSeed} ancora di esempio` : "tutte tue ✓",
    }),
  },
  {
    id: "audio",
    title: "Un tuo vocale",
    description: "La tua voce, per quando non riesce a dormire o le manchi.",
    category: "Audio",
    priority: "recommended",
    href: "/admin/foto",
    cta: "Carica",
    skippable: true,
    check: (f) => atLeast(f.audio, 1, () => "ancora nessuno"),
  },
  {
    id: "more-audio",
    title: "Qualche vocale in più",
    description: "Tre vocali diversi: buonanotte, coraggio, ti amo.",
    category: "Audio",
    priority: "optional",
    href: "/admin/foto",
    skippable: true,
    check: (f) => atLeast(f.audio, 3, (n) => altre(n, "vocale", "vocali")),
  },
  // --- Adam AI --------------------------------------------------------------
  {
    id: "ai-key",
    title: "Accendi Adam AI",
    description: "Serve una chiave gratuita di Google AI Studio (GEMINI_API_KEY su Vercel).",
    category: "Adam AI",
    priority: "essential",
    href: "/admin/ai",
    check: (f) =>
      !f.settings.ai.enabled ? { done: true, detail: "Adam AI è spenta nelle impostazioni" } : { done: f.env.ai, detail: f.env.ai ? "chiave configurata" : "manca GEMINI_API_KEY" },
  },
  {
    id: "ai-profile",
    title: "Racconta ad Adam AI chi siete",
    description: "Tono, personalità e contesto: solo cose vere, così non inventa nulla.",
    category: "Adam AI",
    priority: "recommended",
    href: "/admin/ai",
    skippable: true,
    check: (f) => ({ done: f.savedSettings.has("ai") || f.savedSettings.has("ai_profile"), detail: null }),
  },
  {
    id: "ai-memory",
    title: "Cose che Adam AI deve sapere",
    description: "Soprannomi, posti, abitudini: almeno 5 ricordi per l'AI.",
    category: "Adam AI",
    priority: "recommended",
    href: "/admin/ai-memoria?nuovo=1",
    cta: "Aggiungi",
    skippable: true,
    check: (f) => atLeast(f.aiMemory, 5, (n) => altre(n, "cosa", "cose")),
  },
  {
    id: "ai-test",
    title: "Prova Adam AI come la vedrà lei",
    description: "Apri Adam AI (in \"Vedi come Viola\") e prova le tre modalità: Generale, Personale, Conforto.",
    category: "Adam AI",
    priority: "recommended",
    href: "/viola/ai",
    cta: "Prova",
    skippable: true,
    check: (f) => {
      const n = ["general", "personal", "comfort"].filter((m) => f.aiModesTested.has(m)).length;
      return { done: n === 3, progress: { value: n, target: 3 }, detail: n === 3 ? "provate tutte" : `${n} modalità su 3` };
    },
  },
  // --- Giochi ---------------------------------------------------------------
  {
    id: "quiz",
    title: "Il quiz \"Quanto mi conosci?\"",
    description: "Almeno 3 domande attive (con la risposta giusta). Senza, il gioco resta nascosto.",
    category: "Giochi",
    priority: "recommended",
    href: "/admin/quiz",
    skippable: true,
    check: (f) => atLeast(f.quizActive, 3, (n) => altre(n, "domanda attiva", "domande attive")),
  },
  {
    id: "roulette",
    title: "La roulette romantica",
    description: "Almeno 4 spicchi (frasi di tipo \"Roulette\").",
    category: "Giochi",
    priority: "optional",
    href: "/admin/frasi",
    skippable: true,
    check: (f) => atLeast(f.phrases.roulette, 4, (n) => altre(n, "spicchio", "spicchi")),
  },
  // --- Manual (cannot be measured) -----------------------------------------
  {
    id: "install-adam",
    title: "Installa Vio ♡ sul tuo telefono",
    description: "Safari → Condividi → \"Aggiungi a Home\" (su Android: menu → \"Installa app\"). Così ricevi le notifiche e vedi le richieste al volo.",
    category: "App",
    priority: "recommended",
    href: "/admin/completa#installa",
    cta: "Come si fa",
    manual: true,
    skippable: true,
  },
  {
    id: "preview-tour",
    title: "Fai il giro \"Vedi come Viola\"",
    description: "Home → Calma → Noi → Giochi → Adam AI → Altro, come la vedrà lei. Niente viene inviato.",
    category: "App",
    priority: "recommended",
    href: "/viola?giro=1",
    cta: "Inizia il giro",
    manual: true,
    skippable: true,
  },
  {
    id: "offline-test",
    title: "Prova senza internet",
    description: "Modalità aereo: la pagina Calma e i tuoi contatti devono aprirsi lo stesso.",
    category: "App",
    priority: "optional",
    href: "/viola/calma",
    cta: "Prova",
    manual: true,
    skippable: true,
  },
  {
    id: "keepalive",
    title: "Proteggi il \"tieni sveglio\" giornaliero",
    description: "Supabase gratis va in pausa dopo 7 giorni senza uso: l'app lo evita da sola ogni giorno. Con CRON_SECRET su Vercel nessun altro può chiamarlo.",
    category: "App",
    priority: "optional",
    href: "/admin/completa#cron",
    cta: "Come si fa",
    skippable: true,
    check: (f) => ({ done: f.env.cronSecret, detail: f.env.cronSecret ? "protetto" : "funziona anche così" }),
  },
];

type Stamped = { title: string; created_at: string; updated_at: string };

/** Titles of the starter examples in supabase/seed.sql (kept in sync by tests/readiness.test.ts). */
export const SEED_TITLES = {
  dedications: [
    "Quando sei triste",
    "Una cosa che non ti dico abbastanza",
    "Quando hai paura",
    "Quando ti senti sola",
    "Quando ti manco",
    "Per farti sorridere",
    "Senza nessun motivo",
    "Quando hai bisogno di amore",
    "Se oggi è stata una giornata no",
    "Promemoria",
  ],
  open_when_cards: [
    "Aprimi quando ti senti sola",
    "Aprimi quando ti manco",
    "Aprimi quando hai avuto una giornata terribile",
    "Aprimi quando vuoi sentirti amata",
    "Aprimi quando non riesci a dormire",
    "Aprimi quando vuoi sorridere",
  ],
} as const;

/**
 * The starter examples nobody has touched: created by the seed (one
 * transaction → the table's oldest created_at), with a seed title, never
 * edited since. Rewriting or re-saving one makes it "yours".
 */
export function untouchedSeed<T extends Stamped>(rows: T[], titles: readonly string[]): T[] {
  if (!rows.length) return [];
  const first = rows.reduce((m, r) => (r.created_at < m ? r.created_at : m), rows[0].created_at);
  const seed = new Set(titles);
  return rows.filter((r) => r.created_at === first && r.updated_at === r.created_at && seed.has(r.title));
}

export const TASK_IDS = new Set(TASKS.map((t) => t.id));

export function levelOf(essentialsLeft: number, recommendedLeft: number): ReadinessLevel {
  if (essentialsLeft > 0) return "todo";
  return recommendedLeft > 0 ? "almost" : "ready";
}

export function evaluateTasks(facts: ReadinessFacts): ReadinessSummary {
  const tasks: TaskResult[] = TASKS.map((t) => {
    const m = facts.manual.get(t.id);
    const auto: Eval = t.check ? t.check(facts) : { done: false };
    const skipped = Boolean(t.skippable && m?.state === "skipped" && !auto.done);
    const manualDone = Boolean(t.manual && m?.state === "done");
    const done = auto.done || manualDone || skipped;
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      href: t.href,
      cta: t.cta ?? "Completa",
      done,
      manual: Boolean(t.manual),
      skippable: Boolean(t.skippable),
      skipped,
      doneAt: manualDone || skipped ? (m?.doneAt ?? null) : null,
      detail: auto.detail ?? null,
      progress: auto.progress ?? null,
    };
  });
  let total = 0;
  let got = 0;
  for (const t of tasks) {
    const w = PRIORITY_META[t.priority].weight;
    total += w;
    if (t.done) got += w;
  }
  const left = (p: Priority) => tasks.filter((t) => !t.done && t.priority === p).length;
  const percent = total ? Math.floor((got / total) * 100) : 100;
  return {
    percent,
    level: levelOf(left("essential"), left("recommended")),
    remaining: tasks.filter((t) => !t.done).length,
    essentialsLeft: left("essential"),
    tasks,
  };
}

/** The warm line under the percentage. */
export function readinessMessage(s: Pick<ReadinessSummary, "percent" | "level" | "remaining">, viola: string) {
  if (s.remaining === 0) return { title: "Vio ♡ è pronta. ♡", text: `Ora puoi lasciarla nelle mani di ${viola}. ♡` };
  if (s.level === "ready") return { title: `È tutto pronto per lei. ♡`, text: "Restano solo piccoli extra, se ti va." };
  if (s.level === "almost") return { title: "Il vostro piccolo mondo è quasi pronto. ♡", text: "Mancano solo le cose che la rendono ancora più vostra." };
  return { title: "Ancora qualche passo ♡", text: "Prima le cose importanti: sono quelle che servono quando ha bisogno di te." };
}

export const LEVEL_META: Record<ReadinessLevel, { label: string; dot: string }> = {
  ready: { label: "Pronta", dot: "🟢" },
  almost: { label: "Quasi pronta", dot: "🟡" },
  todo: { label: "Da completare", dot: "🔴" },
};
