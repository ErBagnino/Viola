// The state of one writing session (per editor, in memory only): every
// version the AI wrote, the mini-chat, the sentences to keep, and what was
// in the editor before Adam used a draft (for "Annulla"). Nothing is saved
// to the database: the form's own "Salva" does that, as always.
import { extractKeepPhrases } from "./targets";

export type Version = { id: number; text: string; kind: "ai" | "edit"; note: string; warning?: string; instruction?: string };
export type ChatLine = { from: "adam" | "ai"; text: string };

export type WritingSession = {
  versions: Version[];
  /** the version on screen (-1 = none yet) */
  index: number;
  pending: null | { mode: "generate" | "edit"; instruction?: string; addedKeep: string[] };
  /** live text while the AI is writing */
  streaming: string;
  error: string | null;
  chat: ChatLine[];
  /** edit instructions given so far: they keep counting in later requests */
  instructions: string[];
  keep: string[];
  /** Adam used a version: what the editor held before, for "Annulla" */
  applied: null | { previous: string; versionId: number };
  nextId: number;
};

export type SessionAction =
  | { type: "start"; mode: "generate" | "edit"; instruction?: string }
  | { type: "delta"; v: string }
  | { type: "reset" }
  | { type: "done"; text: string; note: string; warning?: string }
  | { type: "fail"; message: string }
  | { type: "cancel" }
  | { type: "select"; index: number }
  | { type: "applied"; previous: string }
  | { type: "undo" }
  | { type: "dismissError" };

export const emptySession = (): WritingSession => ({ versions: [], index: -1, pending: null, streaming: "", error: null, chat: [], instructions: [], keep: [], applied: null, nextId: 1 });

/** Undo what "start" added when the request did not produce a version. */
function rollback(s: WritingSession): WritingSession {
  const p = s.pending;
  if (!p) return s;
  const hadInstruction = Boolean(p.instruction);
  return {
    ...s,
    pending: null,
    streaming: "",
    chat: hadInstruction ? s.chat.slice(0, -1) : s.chat,
    instructions: hadInstruction ? s.instructions.slice(0, -1) : s.instructions,
    keep: s.keep.filter((k) => !p.addedKeep.includes(k)),
  };
}

export function sessionReducer(s: WritingSession, a: SessionAction): WritingSession {
  switch (a.type) {
    case "start": {
      if (s.pending) return s; // never two requests at the same time
      const instruction = a.instruction?.trim() || undefined;
      const addedKeep = instruction ? extractKeepPhrases(instruction).filter((k) => !s.keep.includes(k)) : [];
      return {
        ...s,
        pending: { mode: a.mode, instruction, addedKeep },
        streaming: "",
        error: null,
        chat: instruction ? [...s.chat, { from: "adam", text: instruction }] : s.chat,
        instructions: instruction ? [...s.instructions, instruction].slice(-8) : s.instructions,
        keep: [...s.keep, ...addedKeep].slice(-6),
      };
    }
    case "delta":
      return s.pending ? { ...s, streaming: s.streaming + a.v } : s;
    case "reset":
      return s.pending ? { ...s, streaming: "" } : s;
    case "done": {
      if (!s.pending) return s;
      const v: Version = { id: s.nextId, text: a.text, kind: s.pending.mode === "edit" ? "edit" : "ai", note: a.note, warning: a.warning, instruction: s.pending.instruction };
      const versions = [...s.versions, v];
      return { ...s, versions, index: versions.length - 1, pending: null, streaming: "", error: null, chat: [...s.chat, { from: "ai", text: a.note }], nextId: s.nextId + 1 };
    }
    case "fail":
      return { ...rollback(s), error: a.message };
    case "cancel":
      return rollback(s);
    case "select":
      return s.versions.length ? { ...s, index: Math.max(0, Math.min(s.versions.length - 1, a.index)) } : s;
    case "applied": {
      const v = s.versions[s.index];
      return v ? { ...s, applied: { previous: a.previous, versionId: v.id } } : s;
    }
    case "undo":
      return { ...s, applied: null };
    case "dismissError":
      return { ...s, error: null };
  }
}

/** The text an edit works on: the draft on screen, or else Adam's own text. */
export function editBase(s: WritingSession, current: string) {
  return s.versions[s.index]?.text ?? current;
}
