// Shared types between the AI routes (server) and the chat UI (client).

export type ChatAction =
  | { type: "link"; title: string; subtitle?: string; href: string; icon: string }
  | { type: "photo"; mediaId: string; url?: string; title?: string | null; caption?: string | null; date?: string | null }
  | { type: "memory"; id: string; title: string; excerpt: string; date?: string | null; mediaId?: string | null; url?: string }
  | { type: "dedication"; id: string; title: string; excerpt: string; signature: string }
  | { type: "tool"; tool: string; summary: string; ok: boolean }
  | { type: "confirm"; logId: string; tool: string; summary: string; state: "pending" | "confirmed" | "rejected" };

export type StreamEvent =
  | { t: "meta"; conversationId: string }
  | { t: "text"; v: string }
  | { t: "action"; action: ChatAction }
  | { t: "done"; messageId: string | null }
  | { t: "error"; message: string; code: string };

export type ChatMessage = {
  id: string;
  role: "user" | "model" | "note";
  content: string;
  actions: ChatAction[];
  status: "ok" | "error" | "stopped";
  createdAt: string;
};

export type ConversationSummary = { id: string; title: string | null; mode: string; updatedAt: string };
