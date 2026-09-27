// Option sets shared by Viola's UI, the admin forms and the AI tools.
// (Plain module: safe to import from both server and client code.)

export const MOODS = [
  { value: 1, emoji: "😭", label: "Malissimo" },
  { value: 2, emoji: "😔", label: "Giù" },
  { value: 3, emoji: "😐", label: "Così così" },
  { value: 4, emoji: "🙂", label: "Bene" },
  { value: 5, emoji: "🥰", label: "Benissimo" },
] as const;

export const DEDICATION_CATEGORIES: Record<string, string> = {
  sad: "Quando sei triste",
  fear: "Quando hai paura",
  lonely: "Quando ti senti sola",
  miss_me: "Quando mi manchi",
  smile: "Quando vuoi sorridere",
  love: "Quando hai bisogno di amore",
  no_reason: "Senza motivo",
};

export const MEMORY_KINDS: Record<string, { label: string; emoji: string }> = {
  date: { label: "Appuntamento", emoji: "🌹" },
  trip: { label: "Viaggio", emoji: "✈️" },
  anniversary: { label: "Anniversario", emoji: "💍" },
  birthday: { label: "Compleanno", emoji: "🎂" },
  place: { label: "Luogo", emoji: "📍" },
  moment: { label: "Momento", emoji: "✨" },
  other: { label: "Ricordo", emoji: "♡" },
};

export const COMFORT_CATEGORIES: Record<string, { label: string; color: string }> = {
  breathing: { label: "Respiro", color: "bg-lilac-100 text-lilac-600" },
  grounding: { label: "Grounding", color: "bg-peach-100 text-vio-700" },
  sensory: { label: "Sensi", color: "bg-blush-100 text-vio-700" },
  movement: { label: "Movimento", color: "bg-peach-100 text-vio-700" },
  distraction: { label: "Distrazione", color: "bg-lilac-100 text-lilac-600" },
  writing: { label: "Scrivere", color: "bg-cream-200 text-vio-800" },
  social: { label: "Contatto", color: "bg-blush-100 text-vio-700" },
  romantic: { label: "Noi", color: "bg-blush-200 text-vio-800" },
  practical: { label: "Pratico", color: "bg-cream-200 text-vio-800" },
};

export const COUNTDOWN_KINDS: Record<string, string> = {
  anniversary: "Anniversario",
  birthday: "Compleanno",
  meeting: "Prossimo incontro",
  trip: "Viaggio",
  event: "Evento",
  custom: "Data personalizzata",
};

/** "Mancano 12 giorni …" — the end of the sentence for each countdown type. */
export const COUNTDOWN_LEADS: Record<string, string> = {
  anniversary: "al nostro anniversario",
  birthday: "al tuo compleanno",
  meeting: "per rivederti",
  trip: "alla partenza",
};

export const SURPRISE_KINDS: Record<string, string> = {
  photo: "Foto",
  memory: "Ricordo",
  dedication: "Dedica",
  question: "Domanda",
  mini_game: "Mini-gioco",
  exercise: "Esercizio",
  phrase: "Frase",
  surprise: "Sorpresa",
};

export const PHRASE_KINDS: Record<string, string> = {
  home: "Home (frase casuale)",
  good_morning: "Buongiorno",
  mission: "Micro missione del mattino",
  good_night: "Buonanotte",
  question: "Domande casuali",
  roulette: "Roulette romantica",
  hug: "Abbraccio",
  breathing: "Durante la respirazione",
  smile: "Voglio sorridere",
  calm_end: "Fine calma",
  da_adam: "\"Da Adam\"",
};

export const AUDIO_CATEGORIES: Record<string, string> = {
  voice: "Vocale",
  song: "Canzone",
  sleep: "Per dormire",
  breathing: "Respiro",
  other: "Altro",
};

export const AI_MEMORY_CATEGORIES: Record<string, string> = {
  nickname: "Soprannomi",
  person: "Persone",
  place: "Luoghi",
  memory: "Ricordi",
  date: "Date importanti",
  preference: "Preferenze",
  fact: "Fatti",
  other: "Altro",
};

export const MEDIA_CONTEXTS: Record<string, string> = {
  gallery: "Galleria",
  breathing: "Respirazione",
  home: "Home / Buongiorno",
  adam_ai: "Foto di Adam (avatar, abbraccio)",
  dedications: "Dediche",
  memories: "Ricordi",
  surprises: "Sorprese",
};

export const MEDIA_CATEGORY_SUGGESTIONS = ["noi", "adam", "viola", "viaggi", "appuntamenti", "casa", "divertenti"];

export const OPEN_WHEN_ANIMATIONS: Record<string, string> = { hearts: "Cuori", stars: "Stelle", petals: "Petali", none: "Nessuna" };

export const TONE_OPTIONS: Record<string, string> = {
  blush: "Rosa cipria",
  peach: "Pesca",
  lilac: "Lilla",
  cream: "Crema",
  wine: "Rosso vino",
  red: "Rosso",
  night: "Notte",
};

export const HOME_WIDGETS: Record<string, string> = {
  help_now: "Pulsante \"Aiutami adesso\"",
  mood: "Come ti senti? (umore)",
  need_adam: "Pulsante \"Ho bisogno di Adam\"",
  daily_surprise: "Una cosa per te (sorpresa del giorno)",
  countdown: "Countdown",
  distance: "Distanza",
  heart: "Cuore a distanza (manda un pensiero ad Adam)",
};

export const MESSAGE_CATEGORIES = {
  thought: "Un pensiero",
  love: "Ti amo",
  sad: "Sono giù",
  need: "Ho bisogno",
  happy: "Sono felice",
  other: "Altro",
} as const;

/** Pairs in the memory game (photos first, emoji for the rest). */
export const MEMORY_PAIRS = 6;

/** "Ho bisogno di Adam" request states, as Adam reads them. */
export const REQUEST_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Nuova", cls: "bg-rouge-500 text-white" },
  seen: { label: "Vista", cls: "bg-lilac-200 text-lilac-600" },
  responded: { label: "Hai risposto", cls: "bg-green-100 text-green-800" },
  closed: { label: "Chiusa", cls: "bg-cream-200 text-ink-soft" },
};
