import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("paper rounded-4xl p-5", className)} {...rest} />;
}

export const TONES = {
  wine: "from-wine-600 to-wine-800 text-white",
  red: "from-rouge-400 to-rouge-600 text-white",
  blush: "from-blush-100 to-blush-200 text-wine-900",
  peach: "from-peach-100 to-peach-200 text-wine-900",
  lilac: "from-lilac-100 to-lilac-200 text-wine-900",
  cream: "from-cream-50 to-cream-200 text-wine-900",
  night: "from-night-700 to-night-900 text-moon",
} as const;

export type Tone = keyof typeof TONES;

export function toneClass(color?: string | null) {
  return TONES[(color as Tone) in TONES ? (color as Tone) : "blush"];
}

export function isDarkTone(color?: string | null) {
  return color === "wine" || color === "red" || color === "night";
}
