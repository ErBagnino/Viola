import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("paper rounded-4xl p-5", className)} {...rest} />;
}

// Card tones. Light tones are white paper with a quiet tint (they follow the
// dark theme automatically); strong tones are the icon's colours: deep wine,
// icon red and black.
export const TONES = {
  wine: "from-wine-600 to-wine-800 text-white",
  red: "from-rouge-400 to-rouge-600 text-white",
  night: "from-night-700 to-night-900 text-moon ring-1 ring-white/10",
  blush: "from-surface to-blush-100 text-vio-900 ring-1 ring-line",
  peach: "from-surface to-peach-100 text-vio-900 ring-1 ring-line",
  lilac: "from-surface to-lilac-100 text-vio-900 ring-1 ring-line",
  cream: "from-surface to-cream-100 text-vio-900 ring-1 ring-line",
} as const;

export type Tone = keyof typeof TONES;

export function toneClass(color?: string | null) {
  return TONES[(color as Tone) in TONES ? (color as Tone) : "blush"];
}

export function isDarkTone(color?: string | null) {
  return color === "wine" || color === "red" || color === "night";
}
