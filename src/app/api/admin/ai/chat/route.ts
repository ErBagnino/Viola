import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { serverEnv } from "@/server/env";
import { isAiConfigured } from "@/server/ai/gemini";
import { modelChain } from "@/server/ai/models";
import { buildCopilotPrompt } from "@/server/ai/prompt";
import { checkAiLimits, recordAiUsage } from "@/server/ai/limits";
import { loadHistory, withoutLastAnswer, withUserTurn } from "@/server/ai/history";
import { friendlyAiError, runChatLoop, saveModelMessage } from "@/server/ai/run-chat";
import { copilotDeclarations, runCopilotTool } from "@/server/ai/copilot-tools";
import { ndjsonStream } from "@/server/ai/stream";

export const runtime = "nodejs";
export const maxDuration = 60;
// Stop waiting for the model before the platform kills the function, so the user gets a real answer.
const AI_TIMEOUT_MS = 50_000;

const bodySchema = z.object({
  conversationId: z.uuid().nullish(),
  message: z.string().trim().max(6000).optional().default(""),
  regenerate: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const [viewer, settings, body] = await Promise.all([getViewer(), getSettings(), request.json().catch(() => null)]);
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Solo Adam può usare il Copilot." }, { status: 403 });
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || (!parsed.data.regenerate && !parsed.data.message)) return NextResponse.json({ error: "Messaggio non valido." }, { status: 400 });
  const { message, regenerate } = parsed.data;
  const supabase = await createClient();

  return ndjsonStream(async (send) => {
    if (!settings.ai.copilotEnabled || !isAiConfigured()) {
      send({ t: "error", code: "offline", message: isAiConfigured() ? "Il Copilot è disattivato nelle impostazioni AI." : "Manca GEMINI_API_KEY: vedi SETUP.md." });
      return;
    }
    // limits, conversation and history in one round trip to the database
    const askedId = parsed.data.conversationId ?? null;
    const [limit, existing, history] = await Promise.all([
      checkAiLimits(supabase, viewer.id, "copilot", settings),
      askedId ? supabase.from("ai_conversations").select("id").eq("id", askedId).eq("scope", "copilot").maybeSingle().then((r) => r.data) : null,
      askedId ? loadHistory(supabase, askedId, 30) : Promise.resolve([]),
    ]);
    if (!limit.ok) {
      send({ t: "error", code: "limit", message: settings.texts.aiPause });
      return;
    }

    let conversationId = existing?.id ?? null;
    if (!conversationId) {
      if (regenerate) return send({ t: "error", code: "error", message: settings.texts.errorText });
      const { data, error } = await supabase.from("ai_conversations").insert({ scope: "copilot", title: message.slice(0, 60) }).select("id").single();
      if (!data) {
        console.error(`[copilot] conversation insert failed ${JSON.stringify({ at: new Date().toISOString(), code: error?.code, message: error?.message?.slice(0, 200) })}`);
        return send({ t: "error", code: "database", message: `Non riesco a salvare la conversazione nel database (${error?.code ?? "?"}). Controlla Supabase.` });
      }
      conversationId = data.id;
    }
    const convId = conversationId;
    send({ t: "meta", conversationId: convId });

    // saved while Gemini is already answering, awaited before the answer is saved
    let saving: Promise<unknown>;
    let contents;
    if (regenerate) {
      saving = (async () => {
        const { data: lastUser } = await supabase.from("ai_messages").select("created_at").eq("conversation_id", convId).eq("role", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (lastUser) await supabase.from("ai_messages").delete().eq("conversation_id", convId).eq("role", "model").gt("created_at", lastUser.created_at);
      })();
      contents = withoutLastAnswer(existing ? history : []);
    } else {
      saving = Promise.resolve(supabase.from("ai_messages").insert({ conversation_id: convId, role: "user", content: message })).then(
        (r) => r.error && console.error(`[copilot] user message not saved ${JSON.stringify({ code: r.error.code, message: r.error.message?.slice(0, 200) })}`),
      );
      contents = withUserTurn(existing ? history : [], message);
    }

    let text = "";
    try {
      const out = await runChatLoop({
        models: modelChain(settings, serverEnv.geminiModel, { textOnly: false }),
        system: buildCopilotPrompt(settings),
        contents,
        tools: copilotDeclarations(),
        maxOutputTokens: Math.max(1024, settings.ai.maxOutputTokens),
        temperature: 0.6,
        // a little thinking picks the right tools; a big budget only makes Adam wait
        thinkingBudget: 256,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(AI_TIMEOUT_MS)]),
        send: (e) => {
          if (e.t === "text") text += e.v;
          send(e);
        },
        runTool: (name, args) => runCopilotTool(name, args, { supabase, adminId: viewer.id, conversationId: convId }),
      });
      await saving;
      const [, id] = await Promise.all([
        recordAiUsage(supabase, "copilot", out.rounds, out.input, out.output),
        saveModelMessage(supabase, convId, viewer.id, out.text, out.actions, "ok", { input: out.input, output: out.output }),
      ]);
      send({ t: "done", messageId: id });
    } catch (e) {
      await saving.catch(() => undefined);
      if (request.signal.aborted) {
        if (text.trim()) await saveModelMessage(supabase, convId, viewer.id, text, [], "stopped", { input: 0, output: 0 });
        return;
      }
      const f = friendlyAiError(e, settings.texts, "admin");
      send({ t: "error", code: f.code, message: f.message });
    }
  });
}
