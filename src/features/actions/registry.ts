// ---------------------------------------------------------------------------
// App actions: the single vocabulary shared by home modules, comfort actions,
// open-when cards, daily surprises and Adam AI tools. Adam picks one of these
// in the admin; the app turns it into a destination.
// ---------------------------------------------------------------------------

export type ActionDef = { label: string; href?: string; icon: string; group: string };

export const APP_ACTIONS = {
  none: { label: "Nessuna azione", icon: "heart", group: "Base" },
  calm: { label: "Calmati", href: "/viola/calma/calmati", icon: "flower", group: "Calma" },
  breathe: { label: "Respira", href: "/viola/calma/respira", icon: "wind", group: "Calma" },
  grounding: { label: "Grounding", href: "/viola/calma/grounding", icon: "footprints", group: "Calma" },
  "54321": { label: "5-4-3-2-1", href: "/viola/calma/54321", icon: "hand", group: "Calma" },
  fear: { label: "Ho paura", href: "/viola/calma/paura", icon: "shield-heart", group: "Calma" },
  help_now: { label: "Aiutami adesso", href: "/viola/calma/aiutami", icon: "sparkles", group: "Calma" },
  calm_area: { label: "Area Calma", href: "/viola/calma", icon: "leaf", group: "Calma" },
  need_adam: { label: "Ho bisogno di Adam", href: "/viola/adam", icon: "heart-handshake", group: "Adam" },
  whatsapp: { label: "Scrivi su WhatsApp", icon: "message-heart", group: "Adam" },
  call: { label: "Chiama Adam", icon: "phone", group: "Adam" },
  write_adam: { label: "Scrivi ad Adam", href: "/viola/scrivi", icon: "pen", group: "Adam" },
  talk: { label: "Voglio parlare", href: "/viola/parliamo", icon: "message-heart", group: "Adam" },
  ai_chat: { label: "Adam AI", href: "/viola/ai", icon: "bot-heart", group: "Adam" },
  see_adam: { label: "Voglio vedere Adam", href: "/viola/noi/foto/random?chi=adam", icon: "camera", group: "Noi" },
  random_photo: { label: "Fammi vedere noi", href: "/viola/noi/foto/random", icon: "images", group: "Noi" },
  gallery: { label: "Foto", href: "/viola/noi/foto", icon: "image", group: "Noi" },
  memories: { label: "Le nostre cose", href: "/viola/noi/ricordi", icon: "book-heart", group: "Noi" },
  random_memory: { label: "Un ricordo a caso", href: "/viola/noi/ricordi?caso=1", icon: "book-heart", group: "Noi" },
  dedications: { label: "Per te ♡", href: "/viola/noi/dediche", icon: "mail-heart", group: "Noi" },
  random_dedication: { label: "Una dedica a caso", href: "/viola/noi/dediche?caso=1", icon: "mail-heart", group: "Noi" },
  open_when: { label: "Aprimi quando…", href: "/viola/noi/aprimi", icon: "gift", group: "Noi" },
  countdown: { label: "Countdown", href: "/viola/noi/countdown", icon: "hourglass", group: "Noi" },
  distance: { label: "Distanza", href: "/viola/noi/distanza", icon: "map-pin", group: "Noi" },
  capsules: { label: "Capsule del tempo", href: "/viola/noi/capsule", icon: "alarm", group: "Noi" },
  noi_area: { label: "Area Noi", href: "/viola/noi", icon: "heart", group: "Noi" },
  surprise: { label: "Sorprendimi", href: "/viola/sorpresa", icon: "gift", group: "Svago" },
  daily: { label: "Una cosa per te", href: "/viola/oggi", icon: "sparkles", group: "Svago" },
  distract: { label: "Voglio distrarmi", href: "/viola/distraiti", icon: "gamepad", group: "Svago" },
  smile: { label: "Voglio sorridere", href: "/viola/sorridi", icon: "laugh", group: "Svago" },
  games: { label: "Giochi", href: "/viola/giochi", icon: "gamepad", group: "Svago" },
  game_memory: { label: "Memory", href: "/viola/giochi/memory", icon: "images", group: "Giochi" },
  game_heart: { label: "Trova il cuore", href: "/viola/giochi/cuore", icon: "heart", group: "Giochi" },
  game_puzzle: { label: "Puzzle", href: "/viola/giochi/puzzle", icon: "puzzle", group: "Giochi" },
  game_quiz: { label: "Quanto mi conosci?", href: "/viola/giochi/quiz", icon: "trophy", group: "Giochi" },
  game_reaction: { label: "Acchiappa i cuori", href: "/viola/giochi/riflessi", icon: "zap", group: "Giochi" },
  game_slider: { label: "Termometro dell'amore", href: "/viola/giochi/termometro", icon: "flame", group: "Giochi" },
  game_questions: { label: "Domande casuali", href: "/viola/giochi/domande", icon: "dice", group: "Giochi" },
  game_roulette: { label: "Roulette romantica", href: "/viola/giochi/roulette", icon: "orbit", group: "Giochi" },
  hug: { label: "Voglio un abbraccio", href: "/viola/abbraccio", icon: "heart-handshake", group: "Svago" },
  good_morning: { label: "Buongiorno", href: "/viola/buongiorno", icon: "sunrise", group: "Svago" },
  good_night: { label: "Buonanotte", href: "/viola/buonanotte", icon: "moon-star", group: "Svago" },
  mood: { label: "Come mi sento", href: "/viola/umore", icon: "smile", group: "Io" },
  journal: { label: "Diario", href: "/viola/diario", icon: "notebook-pen", group: "Io" },
  audio: { label: "La voce di Adam", href: "/viola/audio", icon: "headphones", group: "Noi" },
  url: { label: "Link personalizzato", icon: "compass", group: "Base" },
} as const satisfies Record<string, ActionDef>;

export type AppAction = keyof typeof APP_ACTIONS;
export const APP_ACTION_KEYS = Object.keys(APP_ACTIONS) as AppAction[];

export function isAppAction(v: unknown): v is AppAction {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(APP_ACTIONS, v);
}

export type ContactLinks = { whatsappUrl: string | null; phoneUrl: string | null };

/** Destination URL for an action (null when it cannot be performed). */
export function actionHref(action: string | null | undefined, contact: ContactLinks, customUrl?: string | null): string | null {
  if (!action || !isAppAction(action) || action === "none") return null;
  if (action === "whatsapp") return contact.whatsappUrl;
  if (action === "call") return contact.phoneUrl;
  if (action === "url") return safeUrl(customUrl);
  const def: ActionDef = APP_ACTIONS[action];
  return def.href ?? null;
}

/** Only allow relative paths or http(s)/tel/mailto links. */
export function safeUrl(url?: string | null) {
  if (!url) return null;
  const u = url.trim();
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (/^(https?:\/\/|tel:|mailto:)/i.test(u)) return u;
  return null;
}

export function whatsappLink(number: string | null | undefined, text?: string) {
  const n = (number ?? "").replace(/\D/g, "");
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function phoneLink(number: string | null | undefined) {
  const n = (number ?? "").replace(/[^\d+]/g, "");
  return n ? `tel:${n.startsWith("+") ? n : `+${n}`}` : null;
}
