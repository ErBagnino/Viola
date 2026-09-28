import { NextResponse } from "next/server";
import { getViewer } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { diagnoseGemini } from "@/server/ai/diagnose";

export const runtime = "nodejs";
export const maxDuration = 60;

/** "Prova Gemini" (admin only): the real key, the smallest request, the exact answer. Never returns the key. */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  const check = await diagnoseGemini(await getSettings());
  return NextResponse.json(check, { headers: { "Cache-Control": "no-store" } });
}
