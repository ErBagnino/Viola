import "server-only";
import type { Content, FunctionDeclaration, Part } from "@google/genai";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { ChatAction, StreamEvent } from "@/features/ai-chat/types";
import type { Json } from "@/db/database.types";
import { AiError, streamRound } from "./gemini";

const MAX_ROUNDS = 4;
const MAX_CALLS_PER_ROUND = 4;

export type ToolRunner = (name: string, args: Record<string, unknown>) => Promise<{ result: Record<string, unknown>; actions: ChatAction[] }>;

/**
 * The model ↔ tools loop shared by Adam AI and the admin copilot.
 * Streams text deltas and action cards; returns what to persist.
 */
export async function runChatLoop(opts: {
  models: string[];
  system: string;
  contents: Content[];
  tools: FunctionDeclaration[];
  maxOutputTokens: number;
  temperature: number;
  signal: AbortSignal;
  send: (e: StreamEvent) => void;
  runTool: ToolRunner;
}) {
  const contents = [...opts.contents];
  let text = "";
  const actions: ChatAction[] = [];
  let rounds = 0;
  let input = 0;
  let output = 0;

  for (let i = 0; i < MAX_ROUNDS; i++) {
    rounds++;
    const round = await streamRound({
      models: opts.models,
      system: opts.system,
      contents,
      tools: opts.tools,
      maxOutputTokens: opts.maxOutputTokens,
      temperature: opts.temperature,
      signal: opts.signal,
      onText: (d) => {
        text += d;
        opts.send({ t: "text", v: d });
      },
    });
    input += round.usage.input;
    output += round.usage.output;
    if (!round.calls.length) break;

    contents.push({ role: "model", parts: round.parts });
    const responses: Part[] = [];
    for (const call of round.calls.slice(0, MAX_CALLS_PER_ROUND)) {
      let out: { result: Record<string, unknown>; actions: ChatAction[] };
      try {
        out = await opts.runTool(call.name, call.args);
      } catch (e) {
        out = { result: { errore: e instanceof Error ? e.message.slice(0, 200) : "errore" }, actions: [] };
      }
      for (const a of out.actions) {
        actions.push(a);
        opts.send({ t: "action", action: a });
      }
      responses.push({ functionResponse: { id: call.id, name: call.name, response: out.result } });
    }
    contents.push({ role: "user", parts: responses });
    if (text && !text.endsWith("\n")) {
      text += "\n\n";
      opts.send({ t: "text", v: "\n\n" });
    }
  }
  return { text: text.trim(), actions, rounds, input, output };
}

export function friendlyAiError(e: unknown, texts: { aiPause: string; aiOffline: string; errorText: string }) {
  if (e instanceof AiError) {
    if (e.code === "limit") return { code: "limit", message: texts.aiPause };
    if (e.code === "offline" || e.code === "not_configured") return { code: "offline", message: texts.aiOffline };
    if (e.code === "blocked") return { code: "blocked", message: "Non posso rispondere a questa richiesta. Proviamo in un altro modo? ♡" };
  }
  return { code: "error", message: texts.errorText };
}

export async function saveModelMessage(
  supabase: ServerSupabase,
  conversationId: string,
  userId: string,
  content: string,
  actions: ChatAction[],
  status: "ok" | "error" | "stopped",
  tokens: { input: number; output: number },
) {
  const { data } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "model",
      content: content.slice(0, 39000),
      // strip short-lived signed URLs; they are re-signed when history loads
      actions: actions.map((a) => (a.type === "photo" || a.type === "memory" ? { ...a, url: undefined } : a)) as unknown as NonNullable<Json>,
      status,
      input_tokens: tokens.input,
      output_tokens: tokens.output,
    })
    .select("id")
    .single();
  await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  return data?.id ?? null;
}
