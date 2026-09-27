// Built-in content used when Adam has not configured (or has disabled) the
// corresponding items. The app must never leave Viola in front of an empty
// screen at the moment she needs help.
import type { ComfortItem } from "@/features/comfort/help-now";
import type { Tables } from "@/db/database.types";

/** Small, safe ideas that work anywhere, even offline. */
export const OFFLINE_COMFORT_IDEAS = [
  "Appoggia i piedi a terra e senti il pavimento.",
  "Bevi lentamente un bicchiere d'acqua.",
  "Lavati il viso con acqua fresca.",
  "Abbraccia un cuscino per venti secondi.",
  "Apri la finestra e fai tre respiri lenti.",
  "Trova 5 cose blu intorno a te.",
  "Stringi forte i pugni per 5 secondi, poi lascia andare.",
  "Metti una mano sul petto e senti il tuo respiro.",
];

const idea = (id: string, title: string, text: string, category: string, icon: string, extra: Partial<ComfortItem> = {}): ComfortItem => ({
  id: `builtin-${id}`,
  title,
  text,
  category,
  duration: null,
  icon,
  imageUrl: null,
  soundUrl: null,
  ctaLabel: null,
  ctaHref: null,
  weight: 5,
  ...extra,
});

/** "Aiutami adesso" when no comfort action is configured yet. */
export const FALLBACK_COMFORT: ComfortItem[] = [
  idea("respira", "Respiriamo insieme", "Tre respiri lenti: dentro dal naso, fuori piano dalla bocca. Io conto per te.", "breathing", "wind", { ctaLabel: "Respira con me", ctaHref: "/viola/calma/respira?via=1" }),
  idea("piedi", "Piedi a terra", "Appoggia bene i piedi a terra e premi piano. Senti il pavimento che ti tiene.", "grounding", "footprints", { duration: 30 }),
  idea("sensi", "Il gioco dei sensi", "Cerca 5 cose che vedi, 4 che puoi toccare, 3 che senti… una alla volta.", "sensory", "eye", { ctaLabel: "Iniziamo", ctaHref: "/viola/calma/54321" }),
  idea("acqua", "Un bicchiere d'acqua", "Bevi lentamente un bicchiere d'acqua fresca, un sorso alla volta.", "practical", "glass-water"),
  idea("viso", "Acqua fresca sul viso", "Lavati il viso con acqua fresca. Poi asciugati piano.", "practical", "droplets"),
  idea("cuscino", "Un abbraccio", "Abbraccia forte un cuscino per venti secondi. Conta piano fino a venti.", "movement", "heart", { duration: 20 }),
  idea("finestra", "Aria nuova", "Apri la finestra e fai tre respiri lenti guardando fuori.", "breathing", "wind"),
  idea("mano", "Una mano sul petto", "Metti una mano sul petto e senti il respiro che va e viene. Non devi cambiarlo.", "breathing", "heart-pulse", { duration: 30 }),
  idea("scrivi", "Scrivi ad Adam", "Non serve che abbia senso. Scrivi quello che hai in testa.", "writing", "pen", { ctaLabel: "Scrivi", ctaHref: "/viola/scrivi" }),
];

type HomeModule = Tables<"home_modules">;

const mod = (position: number, m: Pick<HomeModule, "type" | "title"> & Partial<HomeModule>): HomeModule => ({
  id: `builtin-home-${position}`,
  widget: null,
  action: null,
  subtitle: null,
  icon: null,
  color: null,
  size: "md",
  url: null,
  is_enabled: true,
  position,
  created_at: "",
  updated_at: "",
  ...m,
});

/** The home used until Adam builds his own in "Home builder". */
export const DEFAULT_HOME_MODULES: HomeModule[] = [
  mod(10, { type: "widget", widget: "help_now", title: "Aiutami adesso", subtitle: "Ti propongo una cosa da fare, subito." }),
  mod(15, { type: "widget", widget: "need_adam", title: "Ho bisogno di Adam ♡" }),
  mod(20, { type: "widget", widget: "mood", title: "Come ti senti?" }),
  mod(25, { type: "widget", widget: "heart", title: "Cuore a distanza" }),
  mod(30, { type: "action", action: "calm", title: "Ho bisogno di calmarmi", subtitle: "Un posto morbido dove rallentare", icon: "flower" }),
  mod(40, { type: "action", action: "breathe", title: "Ho bisogno di respirare", subtitle: "Respira con me", icon: "wind" }),
  mod(50, { type: "action", action: "fear", title: "Ho paura", subtitle: "Facciamo una cosa alla volta", icon: "shield-heart" }),
  mod(60, { type: "action", action: "talk", title: "Voglio parlare", subtitle: "Scrivimi o parla con Adam AI", icon: "message-heart" }),
  mod(70, { type: "action", action: "distract", title: "Voglio distrarmi", subtitle: "Giochi e piccole cose", icon: "gamepad" }),
  mod(80, { type: "action", action: "memories", title: "Voglio ricordarmi di noi", subtitle: "Le nostre cose", icon: "book-heart" }),
];
