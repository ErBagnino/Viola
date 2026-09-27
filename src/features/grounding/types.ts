import { z } from "zod";

export const groundingStepSchema = z.object({
  title: z.string().trim().min(1).max(120),
  text: z.string().trim().max(600).optional().default(""),
  count: z.number().int().min(0).max(10).optional(),
  emoji: z.string().max(8).optional(),
});

export type GroundingStep = z.infer<typeof groundingStepSchema>;

export type GroundingExercise = {
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  steps: GroundingStep[];
  endText: string;
};

export function parseSteps(raw: unknown): GroundingStep[] {
  const res = z.array(groundingStepSchema).safeParse(raw);
  return res.success ? res.data : [];
}

export const DEFAULT_54321: GroundingExercise = {
  slug: "54321",
  title: "5-4-3-2-1",
  description: "Un gioco con i sensi per tornare qui e ora.",
  icon: "hand",
  endText: "Sei qui. Va bene così. ♡",
  steps: [
    { title: "5 cose che vedi", text: "Guardati intorno con calma.", count: 5, emoji: "👀" },
    { title: "4 cose che senti o tocchi", text: "Il tessuto dei vestiti, il telefono, il pavimento…", count: 4, emoji: "🤲" },
    { title: "3 suoni", text: "Vicini o lontani, anche piccolissimi.", count: 3, emoji: "👂" },
    { title: "2 odori", text: "Se non ne senti, pensa ai tuoi odori preferiti.", count: 2, emoji: "🌸" },
    { title: "1 cosa che ti fa sentire al sicuro", text: "Una persona, un posto, un ricordo.", count: 1, emoji: "💗" },
  ],
};

export const DEFAULT_FEET: GroundingExercise = {
  slug: "piedi-a-terra",
  title: "Piedi a terra",
  description: "Radicarsi al pavimento, un passo alla volta.",
  icon: "footprints",
  endText: "Brava. Sei qui, con i piedi per terra. ♡",
  steps: [
    { title: "Siediti o resta in piedi", text: "Come stai più comoda." },
    { title: "Senti i piedi", text: "Appoggiali bene a terra. Senti il peso che scende." },
    { title: "Premi piano", text: "Spingi leggermente i piedi verso il pavimento per 5 secondi. Poi rilascia." },
    { title: "Respira", text: "Tre respiri lenti, sentendo il pavimento che ti sostiene." },
    { title: "Sei qui", text: "Il pavimento c'è. Tu ci sei." },
  ],
};
