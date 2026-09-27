// Calm visual modes (plain module: usable on server and client).

export type CalmMode = "heart" | "flower" | "wave" | "star" | "breath" | "orbit" | "particles" | "glow";

export const CALM_MODES: { value: CalmMode; label: string; emoji: string; hint: string }[] = [
  { value: "heart", label: "Cuore", emoji: "💗", hint: "Segui il battito lento" },
  { value: "flower", label: "Fiore", emoji: "🌸", hint: "Si apre e si chiude piano" },
  { value: "wave", label: "Onda", emoji: "🌊", hint: "Come il mare, avanti e indietro" },
  { value: "star", label: "Stella", emoji: "⭐", hint: "Stelle che brillano piano" },
  { value: "breath", label: "Respiro visivo", emoji: "🫧", hint: "Dentro quando cresce, fuori quando cala" },
  { value: "orbit", label: "Orbita", emoji: "🪐", hint: "Guarda i puntini girare" },
  { value: "particles", label: "Particelle", emoji: "✨", hint: "Tocca lo schermo" },
  { value: "glow", label: "Cerchio luminoso", emoji: "🌕", hint: "Una luce morbida" },
];


export function isCalmMode(v: unknown): v is CalmMode {
  return CALM_MODES.some((m) => m.value === v);
}
