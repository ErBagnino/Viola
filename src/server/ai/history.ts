import "server-only";
import type { Content } from "@google/genai";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { ChatAction, ChatMessage } from "@/features/ai-chat/types";
import { mediaByIds } from "@/server/media";

/** Last N text turns of a conversation in Gemini format. */
export async function loadHistory(supabase: ServerSupabase, conversationId: string, limit = 24): Promise<Content[]> {
  const { data } = await supabase
    .from("ai_messages")
    .select("role, content, status")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "model"])
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []).reverse().filter((m) => m.content.trim());
  const contents: Content[] = [];
  for (const m of rows) {
    const role = m.role === "user" ? "user" : "model";
    const last = contents[contents.length - 1];
    // Gemini wants alternating roles: merge consecutive turns of the same role.
    if (last && last.role === role) last.parts!.push({ text: m.content });
    else contents.push({ role, parts: [{ text: m.content }] });
  }
  while (contents.length && contents[0].role !== "user") contents.shift();
  return contents;
}

/** The new question joins the history in memory (it is saved in parallel, not read back). */
export function withUserTurn(contents: Content[], text: string): Content[] {
  const out = contents.map((c) => ({ ...c, parts: [...(c.parts ?? [])] }));
  const last = out[out.length - 1];
  if (last?.role === "user") last.parts.push({ text });
  else out.push({ role: "user", parts: [{ text }] });
  return out;
}

/** "Rigenera": the history without the answer being replaced. */
export function withoutLastAnswer(contents: Content[]): Content[] {
  const out = [...contents];
  while (out.length && out[out.length - 1].role === "model") out.pop();
  return out;
}

type MessageRow = { id: string; role: string; content: string; status: string; created_at: string; actions: unknown };

/** The most recent messages of a conversation (oldest first), with fresh signed URLs for photo cards. */
export async function loadMessagesForUi(supabase: ServerSupabase, conversationId: string): Promise<ChatMessage[]> {
  const { data } = await supabase.from("ai_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(200);
  return toUiMessages(supabase, (data ?? []).reverse());
}

/**
 * The conversation she was having in the last few hours, to pick it up where
 * she left it (one query: the conversation with its latest messages).
 */
export async function loadRecentConversation(supabase: ServerSupabase, scope: "viola" | "copilot", maxAgeHours = 6) {
  const since = new Date(Date.now() - maxAgeHours * 3600_000).toISOString();
  const { data } = await supabase
    .from("ai_conversations")
    .select("id, mode, ai_messages(id, role, content, status, created_at, actions)")
    .eq("scope", scope)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .order("created_at", { referencedTable: "ai_messages", ascending: false })
    .limit(1)
    .limit(200, { referencedTable: "ai_messages" })
    .maybeSingle();
  if (!data || !data.ai_messages?.length) return null;
  return { id: data.id, mode: data.mode, messages: await toUiMessages(supabase, [...data.ai_messages].reverse()) };
}

async function toUiMessages(supabase: ServerSupabase, msgs: MessageRow[]): Promise<ChatMessage[]> {
  const ids: string[] = [];
  for (const m of msgs) for (const a of (m.actions as ChatAction[]) ?? []) if ((a.type === "photo" || a.type === "memory") && a.mediaId) ids.push(a.mediaId);
  const media = await mediaByIds(supabase, ids);
  return msgs.map((m) => ({
    id: m.id,
    role: m.role as ChatMessage["role"],
    content: m.content,
    status: m.status as ChatMessage["status"],
    createdAt: m.created_at,
    actions: ((m.actions as ChatAction[]) ?? []).map((a) =>
      (a.type === "photo" || a.type === "memory") && a.mediaId ? { ...a, url: media.get(a.mediaId)?.url } : a,
    ),
  }));
}
