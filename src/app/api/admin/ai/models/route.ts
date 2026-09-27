import { NextResponse } from "next/server";
import { getViewer } from "@/server/auth";
import { isAiConfigured, listAvailableModels } from "@/server/ai/gemini";

export const runtime = "nodejs";

/** Lists the Gemini models available to this API key (admin helper). */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  if (!isAiConfigured()) return NextResponse.json({ error: "Manca GEMINI_API_KEY." }, { status: 400 });
  try {
    return NextResponse.json({ models: await listAvailableModels() });
  } catch {
    return NextResponse.json({ error: "Non riesco a leggere i modelli: controlla la chiave." }, { status: 502 });
  }
}
