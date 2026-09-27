export type BreathingVisual = "heart" | "sphere" | "flower" | "orb" | "star" | "wave";

export const BREATHING_VISUALS: { value: BreathingVisual; label: string }[] = [
  { value: "heart", label: "Cuore" },
  { value: "sphere", label: "Sfera" },
  { value: "flower", label: "Fiore" },
  { value: "orb", label: "Luna" },
  { value: "star", label: "Stella" },
  { value: "wave", label: "Onda" },
];

export type BreathingPresetView = {
  id: string;
  name: string;
  description: string | null;
  inhale: number;
  hold: number;
  exhale: number;
  holdAfter: number;
  rounds: number | null;
  visual: BreathingVisual;
  showPhotos: boolean;
  photoMode: "blur_to_clear" | "fade" | "none";
  texts: string[];
  audioUrl: string | null;
};

export type BreathingPhoto = { url: string; text: string | null };
