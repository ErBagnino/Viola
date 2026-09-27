// "Completa Vio ♡" — shared types (used by the server engine and the UI).

export type Priority = "essential" | "recommended" | "optional";

export const PRIORITY_META: Record<Priority, { label: string; short: string; dot: string; weight: number }> = {
  essential: { label: "Importante", short: "Importante", dot: "🔴", weight: 3 },
  recommended: { label: "Per renderla più bella", short: "Consigliato", dot: "🟡", weight: 2 },
  optional: { label: "Extra", short: "Facoltativo", dot: "🟢", weight: 1 },
};

export type TaskCategory = "Coppia" | "Contatti" | "Foto" | "Ricordi" | "Dediche" | "Buste" | "Audio" | "Adam AI" | "Giochi" | "App";

export type TaskResult = {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: Priority;
  /** where to complete it (admin page, Viola preview or an external guide) */
  href: string;
  cta: string;
  done: boolean;
  /** automatic tasks derive `done` from the data; manual ones are ticked by Adam */
  manual: boolean;
  /** Adam may mark it "Non mi serve" */
  skippable: boolean;
  /** skipped by Adam ("Non mi serve"): counts as done */
  skipped: boolean;
  doneAt: string | null;
  /** short live status, e.g. "4 foto su 6" */
  detail: string | null;
  progress: { value: number; target: number } | null;
};

export type ReadinessLevel = "ready" | "almost" | "todo";

export type ReadinessSummary = {
  percent: number;
  level: ReadinessLevel;
  remaining: number;
  essentialsLeft: number;
  tasks: TaskResult[];
};

/** A section's content status: ✓ Pronto / ⚠ Da completare / ○ Facoltativo */
export type UsageState = "ready" | "todo" | "optional";

export type UsageRow = { label: string; state: UsageState; detail: string; href: string };

export type CheckupItem = { level: "ok" | "warn" | "error"; title: string; detail?: string; href?: string };
