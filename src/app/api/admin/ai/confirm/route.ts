import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";
import { executeConfirmed } from "@/server/ai/copilot-tools";
import { UserError } from "@/server/action-result";
import type { ChatAction } from "@/features/ai-chat/types";
import type { Json } from "@/db/database.types";

export const runtime = "nodejs";

const bodySchema = z.object({ logId: z.uuid(), decision: z.enum(["confirm", "reject"]) });

/** Adam confirms (or rejects) a destructive copilot action. */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  const { logId, decision } = parsed.data;
  const supabase = await createClient();

  const { data: log } = await supabase.from("ai_tool_logs").select("*").eq("id", logId).eq("scope", "copilot").eq("user_id", viewer.id).maybeSingle();
  if (!log || log.status !== "pending") return NextResponse.json({ error: "Azione già gestita o scaduta." }, { status: 409 });
  if (Date.now() - new Date(log.created_at).getTime() > 60 * 60 * 1000) {
    await supabase.from("ai_tool_logs").update({ status: "rejected", result: { errore: "scaduta" } }).eq("id", logId);
    return NextResponse.json({ error: "Conferma scaduta: chiedi di nuovo al Copilot." }, { status: 410 });
  }

  let summary = "";
  let ok = true;
  if (decision === "confirm") {
    try {
      const out = await executeConfirmed(log.tool, log.args as Record<string, unknown>, { supabase, adminId: viewer.id, conversationId: log.conversation_id ?? "" });
      summary = out.actions.map((a) => ("summary" in a ? a.summary : "")).filter(Boolean).join(" · ") || "Fatto";
      await supabase.from("ai_tool_logs").update({ status: "confirmed", success: true, confirmed_at: new Date().toISOString(), result: out.result as Json }).eq("id", logId);
    } catch (e) {
      ok = false;
      summary = e instanceof UserError ? e.message : "Non è stato possibile completare l'azione.";
      await supabase.from("ai_tool_logs").update({ status: "failed", success: false, result: { errore: summary } }).eq("id", logId);
    }
  } else {
    summary = "Annullato";
    await supabase.from("ai_tool_logs").update({ status: "rejected" }).eq("id", logId);
  }

  // Keep the chat history consistent: update the card state + add a note.
  if (log.conversation_id) {
    const { data: msgs } = await supabase.from("ai_messages").select("id, actions").eq("conversation_id", log.conversation_id).eq("role", "model").order("created_at", { ascending: false }).limit(10);
    for (const m of msgs ?? []) {
      const actions = (m.actions as ChatAction[]) ?? [];
      if (actions.some((a) => a.type === "confirm" && a.logId === logId)) {
        const next = actions.map((a) => (a.type === "confirm" && a.logId === logId ? { ...a, state: decision === "confirm" && ok ? "confirmed" : "rejected" } : a));
        await supabase.from("ai_messages").update({ actions: next as unknown as NonNullable<Json> }).eq("id", m.id);
        break;
      }
    }
    await supabase.from("ai_messages").insert({ conversation_id: log.conversation_id, role: "note", content: decision === "confirm" ? `${ok ? "✓" : "✗"} ${summary}` : "Azione annullata da Adam." });
  }
  return NextResponse.json({ ok, summary });
}
