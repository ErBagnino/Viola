import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { serverEnv } from "@/server/env";
import { isAiConfigured } from "@/server/ai/gemini";
import { modelChain } from "@/server/ai/models";
import { buildVioPrompt } from "@/server/ai/prompt";
import { checkAiLimits, recordAiUsage } from "@/server/ai/limits";
import { loadAiMemory } from "@/server/ai/memory";
import { loadHistory } from "@/server/ai/history";
import { friendlyAiError, runChatLoop, saveModelMessage } from "@/server/ai/run-chat";
import { runViolaTool, VIOLA_TOOLS } from "@/server/ai/viola-tools";
import { violaView } from "@/server/viola-view";
import { ndjsonStream } from "@/server/ai/stream";
import { aiModes } from "@/features/settings/schema";
import type { Json } from "@/db/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;
// Stop waiting for the model before the platform kills the function, so the user gets a real answer.
const AI_TIMEOUT_MS = 50_000;

const bodySchema = z.object({
  conversationId: z.uuid().nullish(),
  message: z.string().trim().max(4000).optional().default(""),
  mode: z.enum(aiModes).default("general"),
  regenerate: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  // 1. auth
  const viewer = await getViewer();
  if (!viewer || viewer.role === "pending") return NextResponse.json({ error: "Devi accedere di nuovo." }, { status: 401 });

  // 2. validation
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.regenerate && !parsed.data.message)) return NextResponse.json({ error: "Messaggio non valido." }, { status: 400 });
  const { message, mode, regenerate } = parsed.data;

  const settings = await getSettings();
  const supabase = await createClient();

  return ndjsonStream(async (send) => {
    if (!settings.ai.enabled || !isAiConfigured()) {
      send({ t: "error", code: "offline", message: settings.texts.aiOffline });
      return;
    }
    const limit = await checkAiLimits(supabase, viewer.id, "viola", settings);
    if (!limit.ok) {
      send({ t: "error", code: "limit", message: settings.texts.aiPause });
      return;
    }

    // 3. conversation + context retrieval
    let conversationId = parsed.data.conversationId ?? null;
    if (conversationId) {
      const { data } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).eq("scope", "viola").maybeSingle();
      if (!data) conversationId = null;
    }
    if (!conversationId) {
      if (regenerate) {
        send({ t: "error", code: "error", message: settings.texts.errorText });
        return;
      }
      const { data, error } = await supabase.from("ai_conversations").insert({ scope: "viola", mode, title: message.slice(0, 60) }).select("id").single();
      if (error || !data) {
        console.error(`[ai] conversation insert failed ${JSON.stringify({ at: new Date().toISOString(), code: error?.code, message: error?.message?.slice(0, 200) })}`);
        send({ t: "error", code: "database", message: viewer.role === "admin" ? `Non riesco a salvare la conversazione nel database (${error?.code ?? "?"}). Controlla Supabase e che update.sql sia stato eseguito.` : settings.texts.errorText });
        return;
      }
      conversationId = data.id;
    } else {
      await supabase.from("ai_conversations").update({ mode }).eq("id", conversationId);
    }
    send({ t: "meta", conversationId });

    if (regenerate) {
      // Drop the last answer(s) after the last user message.
      const { data: lastUser } = await supabase.from("ai_messages").select("created_at").eq("conversation_id", conversationId).eq("role", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (lastUser) await supabase.from("ai_messages").delete().eq("conversation_id", conversationId).eq("role", "model").gt("created_at", lastUser.created_at);
    } else {
      await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "user", content: message, actions: [] });
    }

    const [memory, contents] = await Promise.all([loadAiMemory(supabase), loadHistory(supabase, conversationId)]);
    const system = buildVioPrompt(settings, mode, memory);
    const models = modelChain(settings, serverEnv.geminiModel, { textOnly: true });

    // 4-7. Gemini → tool calls → validation → execution → response
    let text = "";
    let actions: Awaited<ReturnType<typeof runChatLoop>>["actions"] = [];
    try {
      const out = await runChatLoop({
        models,
        system,
        contents,
        tools: VIOLA_TOOLS,
        maxOutputTokens: settings.ai.maxOutputTokens,
        temperature: settings.ai.temperature,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(AI_TIMEOUT_MS)]),
        send: (e) => {
          if (e.t === "text") text += e.v;
          if (e.t === "action") actions = [...actions, e.action];
          send(e);
        },
        runTool: async (name, args) => {
          const res = await runViolaTool(name, args, viewer.role === "admin" ? violaView(supabase, viewer.id) : supabase, settings);
          await supabase.from("ai_tool_logs").insert({
            conversation_id: conversationId,
            user_id: viewer.id,
            scope: "viola",
            tool: name,
            args: args as NonNullable<Json>,
            result: res.result as Json,
            success: !("errore" in res.result),
          });
          return res;
        },
      });
      await recordAiUsage(supabase, "viola", out.rounds, out.input, out.output);
      const id = await saveModelMessage(supabase, conversationId, viewer.id, out.text, out.actions, "ok", { input: out.input, output: out.output });
      send({ t: "done", messageId: id });
    } catch (e) {
      if (request.signal.aborted) {
        if (text.trim()) await saveModelMessage(supabase, conversationId, viewer.id, text, actions, "stopped", { input: 0, output: 0 });
        return;
      }
      // details are already in the log (errors.ts); Adam previewing Viola's chat sees the precise cause
      const f = friendlyAiError(e, settings.texts, viewer.role === "admin" ? "admin" : "viola");
      if (f.code !== "limit") await recordAiUsage(supabase, "viola", 1, 0, 0).catch(() => undefined);
      send({ t: "error", code: f.code, message: f.message });
    }
  });
}
