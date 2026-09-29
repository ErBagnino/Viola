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
import { loadHistory, withoutLastAnswer, withUserTurn } from "@/server/ai/history";
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
  // 1. auth, settings and body together (settings do not depend on who asks)
  const [viewer, settings, body] = await Promise.all([getViewer(), getSettings(), request.json().catch(() => null)]);
  if (!viewer || viewer.role === "pending") return NextResponse.json({ error: "Devi accedere di nuovo." }, { status: 401 });

  // 2. validation
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || (!parsed.data.regenerate && !parsed.data.message)) return NextResponse.json({ error: "Messaggio non valido." }, { status: 400 });
  const { message, mode, regenerate } = parsed.data;
  const supabase = await createClient();

  return ndjsonStream(async (send) => {
    if (!settings.ai.enabled || !isAiConfigured()) {
      send({ t: "error", code: "offline", message: settings.texts.aiOffline });
      return;
    }

    // 3. limits, conversation, memory and history in ONE round trip to the database
    const askedId = parsed.data.conversationId ?? null;
    const [limit, existing, memory, history] = await Promise.all([
      checkAiLimits(supabase, viewer.id, "viola", settings),
      askedId ? supabase.from("ai_conversations").select("id, mode").eq("id", askedId).eq("scope", "viola").maybeSingle().then((r) => r.data) : null,
      loadAiMemory(supabase),
      askedId ? loadHistory(supabase, askedId) : Promise.resolve([]),
    ]);
    if (!limit.ok) {
      send({ t: "error", code: "limit", message: settings.texts.aiPause });
      return;
    }

    let conversationId = existing?.id ?? null;
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
    }
    const convId = conversationId;
    send({ t: "meta", conversationId: convId });

    // Saved while Gemini is already answering; awaited before the answer is saved (so it stays in order).
    const saving: Promise<unknown>[] = [];
    const inBackground = (what: string, query: PromiseLike<{ error: { code?: string; message?: string } | null }>) =>
      saving.push(Promise.resolve(query).then((r) => r.error && console.error(`[ai] ${what} not saved ${JSON.stringify({ code: r.error.code, message: r.error.message?.slice(0, 200) })}`)));
    if (existing && existing.mode !== mode) inBackground("mode", supabase.from("ai_conversations").update({ mode }).eq("id", convId));
    let contents;
    if (regenerate) {
      // Drop the last answer(s) after the last user message.
      saving.push(
        (async () => {
          const { data: lastUser } = await supabase.from("ai_messages").select("created_at").eq("conversation_id", convId).eq("role", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (lastUser) await supabase.from("ai_messages").delete().eq("conversation_id", convId).eq("role", "model").gt("created_at", lastUser.created_at);
        })(),
      );
      contents = withoutLastAnswer(existing ? history : []);
    } else {
      inBackground("user message", supabase.from("ai_messages").insert({ conversation_id: convId, role: "user", content: message, actions: [] }));
      contents = withUserTurn(existing ? history : [], message);
    }
    const saved = () => Promise.all(saving);

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
        // a chat, not a puzzle: no thinking pause before the first words
        thinkingBudget: 0,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(AI_TIMEOUT_MS)]),
        send: (e) => {
          if (e.t === "text") text += e.v;
          if (e.t === "action") actions = [...actions, e.action];
          send(e);
        },
        runTool: async (name, args) => {
          const res = await runViolaTool(name, args, viewer.role === "admin" ? violaView(supabase, viewer.id) : supabase, settings);
          inBackground(
            "tool log",
            supabase.from("ai_tool_logs").insert({
              conversation_id: convId,
              user_id: viewer.id,
              scope: "viola",
              tool: name,
              args: args as NonNullable<Json>,
              result: res.result as Json,
              success: !("errore" in res.result),
            }),
          );
          return res;
        },
      });
      await saved();
      const [, id] = await Promise.all([
        recordAiUsage(supabase, "viola", out.rounds, out.input, out.output),
        saveModelMessage(supabase, convId, viewer.id, out.text, out.actions, "ok", { input: out.input, output: out.output }),
      ]);
      send({ t: "done", messageId: id });
    } catch (e) {
      await saved().catch(() => undefined);
      if (request.signal.aborted) {
        if (text.trim()) await saveModelMessage(supabase, convId, viewer.id, text, actions, "stopped", { input: 0, output: 0 });
        return;
      }
      // details are already in the log (errors.ts); Adam previewing Viola's chat sees the precise cause
      const f = friendlyAiError(e, settings.texts, viewer.role === "admin" ? "admin" : "viola");
      if (f.code !== "limit") await recordAiUsage(supabase, "viola", 1, 0, 0).catch(() => undefined);
      send({ t: "error", code: f.code, message: f.message });
    }
  });
}
