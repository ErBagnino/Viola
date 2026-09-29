"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin, assertMember } from "@/server/auth";
import { safeAction, UserError } from "@/server/action-result";
import { loadMessagesForUi } from "@/server/ai/history";
import type { ConversationSummary } from "./types";

const scopeSchema = z.enum(["viola", "copilot"]);

async function guard(scope: "viola" | "copilot") {
  return scope === "copilot" ? assertAdmin() : assertMember();
}

export async function listConversations(scope: "viola" | "copilot") {
  return safeAction(async () => {
    scopeSchema.parse(scope);
    await guard(scope);
    const supabase = await createClient();
    const { data } = await supabase.from("ai_conversations").select("id, title, mode, updated_at").eq("scope", scope).order("updated_at", { ascending: false }).limit(50);
    const items: ConversationSummary[] = (data ?? []).map((c) => ({ id: c.id, title: c.title, mode: c.mode, updatedAt: c.updated_at }));
    return { items };
  });
}

export async function loadConversation(id: string, scope: "viola" | "copilot") {
  return safeAction(async () => {
    scopeSchema.parse(scope);
    await guard(scope);
    if (!z.uuid().safeParse(id).success) throw new UserError("Conversazione non valida");
    const supabase = await createClient();
    // together: RLS already limits the messages to her own conversations
    const [{ data: conv }, messages] = await Promise.all([
      supabase.from("ai_conversations").select("id, mode").eq("id", id).eq("scope", scope).maybeSingle(),
      loadMessagesForUi(supabase, id),
    ]);
    if (!conv) throw new UserError("Conversazione non trovata");
    return { mode: conv.mode, messages };
  });
}

export async function deleteConversation(id: string) {
  return safeAction(async () => {
    await assertMember();
    if (!z.uuid().safeParse(id).success) throw new UserError("Conversazione non valida");
    const supabase = await createClient();
    const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
    if (error) throw error;
    return {};
  });
}

export async function deleteAiMessage(id: string) {
  return safeAction(async () => {
    await assertMember();
    if (!z.uuid().safeParse(id).success) throw new UserError("Messaggio non valido");
    const supabase = await createClient();
    const { error } = await supabase.from("ai_messages").delete().eq("id", id);
    if (error) throw error;
    return {};
  });
}
