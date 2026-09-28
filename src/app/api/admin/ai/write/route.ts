import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { serverEnv } from "@/server/env";
import { AiError, isAiConfigured, streamRound } from "@/server/ai/gemini";
import { modelChain } from "@/server/ai/models";
import { checkAiLimits, recordAiUsage } from "@/server/ai/limits";
import { loadAiMemory } from "@/server/ai/memory";
import { ndjsonStream } from "@/server/ai/stream";
import { buildWritingSystem, buildWritingTurn, writingMaxTokens } from "@/server/ai/writing";
import { missingKeeps, splitNote, visibleDraft, writeRequestSchema, type WritingEvent } from "@/features/ai-writing/targets";

export const runtime = "nodejs";
export const maxDuration = 60;
// Give up before the platform stops the function, so Adam gets a real answer.
const AI_TIMEOUT_MS = 45_000;
// Best-effort guard against a stuck button or a loop: per server instance.
const PER_MINUTE = 12;
const recent = new Map<string, number[]>();

function tooFast(userId: string, now = Date.now()) {
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= PER_MINUTE) return true;
  list.push(now);
  recent.set(userId, list);
  return false;
}

const SAFE = "Il tuo testo è al sicuro, non ho cambiato niente.";

/**
 * Adam's writing assistant: writes or edits ONE draft and streams it back.
 * Nothing is saved: the draft goes into the editor only when Adam chooses it.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Solo Adam può usare l'assistente di scrittura." }, { status: 403 });
  const parsed = writeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Richiesta non valida." }, { status: 400 });
  const req = parsed.data;
  const settings = await getSettings();
  const supabase = await createClient();

  return ndjsonStream<WritingEvent>(async (send) => {
    if (!settings.writing.enabled) return send({ t: "error", code: "offline", message: `L'assistente di scrittura è spento (Admin → Adam AI). ${SAFE}` });
    if (!isAiConfigured()) return send({ t: "error", code: "offline", message: `L'AI non è configurata (manca GEMINI_API_KEY, vedi SETUP.md). ${SAFE}` });
    if (tooFast(viewer.id)) return send({ t: "error", code: "limit", message: `Troppe richieste in un minuto: aspetta un attimo e riprova. ${SAFE}` });
    const limit = await checkAiLimits(supabase, viewer.id, "copilot", settings);
    if (!limit.ok) return send({ t: "error", code: "limit", message: `Per oggi le richieste gratuite all'AI sono finite (si ricaricano domani). ${SAFE}` });

    // Viola's message goes to the AI only when Adam ticked "fagli leggere il messaggio", and never a private one.
    let message: string | null = null;
    if (req.target === "messages.reply" && req.messageId) {
      const { data } = await supabase.from("messages").select("body, is_private").eq("id", req.messageId).maybeSingle();
      if (data && !data.is_private) message = data.body.slice(0, 3000);
    }
    const memory = settings.writing.useMemory ? await loadAiMemory(supabase) : [];
    const system = buildWritingSystem({ settings, req, memory, hasMessage: Boolean(message) });
    const timeout = AbortSignal.timeout(AI_TIMEOUT_MS);
    const signal = AbortSignal.any([request.signal, timeout]);
    let input = 0;
    let output = 0;
    let requests = 0;

    const run = async (retryMissing?: string[]) => {
      requests++;
      let raw = "";
      let shown = "";
      const round = await streamRound({
        models: modelChain(settings, serverEnv.geminiModel, { textOnly: true }),
        system,
        contents: [{ role: "user", parts: [{ text: buildWritingTurn(req, { settings, message, retryMissing }) }] }],
        maxOutputTokens: writingMaxTokens(req),
        temperature: req.mode === "edit" ? 0.6 : 0.9,
        signal,
        onText: (d) => {
          raw += d;
          const visible = visibleDraft(raw);
          if (visible.length > shown.length && visible.startsWith(shown)) {
            send({ t: "text", v: visible.slice(shown.length) });
            shown = visible;
          }
        },
      });
      input += round.usage.input;
      output += round.usage.output;
      return splitNote(round.text || raw, { signature: settings.general.signature, adamName: settings.general.adamName });
    };

    try {
      let out = await run();
      let missing = missingKeeps(out.text, req.keep);
      if (missing.length) {
        send({ t: "reset" });
        out = await run(missing);
        missing = missingKeeps(out.text, req.keep);
      }
      if (!out.text.trim()) throw new AiError("error", "risposta vuota");
      send({
        t: "done",
        text: out.text,
        note: out.note || (req.mode === "edit" ? "Fatto: ho applicato la tua richiesta." : "Ecco una bozza: cambiala come vuoi."),
        ...(missing.length ? { warning: `Non sono riuscito a lasciare identica: ${missing.map((m) => `«${m}»`).join(", ")}. Controlla prima di usarla.` } : {}),
      });
    } catch (e) {
      if (timeout.aborted) send({ t: "error", code: "timeout", message: `L'AI ci sta mettendo troppo. Riprova tra poco. ${SAFE}` });
      else if (request.signal.aborted) return;
      else if (e instanceof AiError && e.code === "limit") send({ t: "error", code: "limit", message: `L'AI ha finito le richieste gratuite per adesso. Riprova più tardi o scrivi a mano ♡ ${SAFE}` });
      else if (e instanceof AiError && (e.code === "offline" || e.code === "not_configured")) send({ t: "error", code: "offline", message: `L'AI non è raggiungibile adesso. ${SAFE}` });
      else if (e instanceof AiError && e.code === "blocked") send({ t: "error", code: "blocked", message: `L'AI non ha voluto scrivere questo testo: prova a dirlo in un altro modo. ${SAFE}` });
      else {
        console.error("[ai-write]", e instanceof Error ? e.message.slice(0, 200) : "errore");
        send({ t: "error", code: "error", message: `Qualcosa non ha funzionato. Riprova. ${SAFE}` });
      }
    } finally {
      if (requests) await recordAiUsage(supabase, "copilot", requests, input, output).catch(() => {});
    }
  });
}
