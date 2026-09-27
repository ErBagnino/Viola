import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { serverEnv } from "@/server/env";
import { isAiConfigured } from "@/server/ai/gemini";
import { buildCopilotPrompt } from "@/server/ai/prompt";
import { checkAiLimits, recordAiUsage } from "@/server/ai/limits";
import { loadHistory } from "@/server/ai/history";
import { friendlyAiError, runChatLoop, saveModelMessage } from "@/server/ai/run-chat";
import { copilotDeclarations, runCopilotTool } from "@/server/ai/copilot-tools";
import { ndjsonStream } from "@/server/ai/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.uuid().nullish(),
  message: z.string().trim().max(6000).optional().default(""),
  regenerate: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Solo Adam può usare il Copilot." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.regenerate && !parsed.data.message)) return NextResponse.json({ error: "Messaggio non valido." }, { status: 400 });
  const { message, regenerate } = parsed.data;
  const settings = await getSettings();
  const supabase = await createClient();

  return ndjsonStream(async (send) => {
    if (!settings.ai.copilotEnabled || !isAiConfigured()) {
      send({ t: "error", code: "offline", message: isAiConfigured() ? "Il Copilot è disattivato nelle impostazioni AI." : "Manca GEMINI_API_KEY: vedi SETUP.md." });
      return;
    }
    const limit = await checkAiLimits(supabase, viewer.id, "copilot", settings);
    if (!limit.ok) {
      send({ t: "error", code: "limit", message: settings.texts.aiPause });
      return;
    }

    let conversationId = parsed.data.conversationId ?? null;
    if (conversationId) {
      const { data } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).eq("scope", "copilot").maybeSingle();
      if (!data) conversationId = null;
    }
    if (!conversationId) {
      if (regenerate) return send({ t: "error", code: "error", message: settings.texts.errorText });
      const { data } = await supabase.from("ai_conversations").insert({ scope: "copilot", title: message.slice(0, 60) }).select("id").single();
      if (!data) return send({ t: "error", code: "error", message: settings.texts.errorText });
      conversationId = data.id;
    }
    send({ t: "meta", conversationId });
    if (regenerate) {
      const { data: lastUser } = await supabase.from("ai_messages").select("created_at").eq("conversation_id", conversationId).eq("role", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (lastUser) await supabase.from("ai_messages").delete().eq("conversation_id", conversationId).eq("role", "model").gt("created_at", lastUser.created_at);
    } else {
      await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "user", content: message });
    }

    const contents = await loadHistory(supabase, conversationId, 30);
    const convId = conversationId;
    let text = "";
    try {
      const out = await runChatLoop({
        models: [serverEnv.geminiModel || settings.ai.model, ...settings.ai.fallbackModels],
        system: buildCopilotPrompt(settings),
        contents,
        tools: copilotDeclarations(),
        maxOutputTokens: Math.max(1024, settings.ai.maxOutputTokens),
        temperature: 0.6,
        signal: request.signal,
        send: (e) => {
          if (e.t === "text") text += e.v;
          send(e);
        },
        runTool: (name, args) => runCopilotTool(name, args, { supabase, adminId: viewer.id, conversationId: convId }),
      });
      await recordAiUsage(supabase, "copilot", out.rounds, out.input, out.output);
      const id = await saveModelMessage(supabase, convId, viewer.id, out.text, out.actions, "ok", { input: out.input, output: out.output });
      send({ t: "done", messageId: id });
    } catch (e) {
      if (request.signal.aborted) {
        if (text.trim()) await saveModelMessage(supabase, convId, viewer.id, text, [], "stopped", { input: 0, output: 0 });
        return;
      }
      console.error("[copilot]", e instanceof Error ? e.message : e);
      const f = friendlyAiError(e, settings.texts);
      send({ t: "error", code: f.code, message: f.message });
    }
  });
}
