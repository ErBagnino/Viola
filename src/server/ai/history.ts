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

/** Messages for the UI, with fresh signed URLs for photo cards. */
export async function loadMessagesForUi(supabase: ServerSupabase, conversationId: string): Promise<ChatMessage[]> {
  const { data } = await supabase.from("ai_messages").select("*").eq("conversation_id", conversationId).order("created_at").limit(200);
  const msgs = data ?? [];
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
