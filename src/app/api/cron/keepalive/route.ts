import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/server/env";

export const dynamic = "force-dynamic";

/**
 * Daily keep-alive (Vercel Cron, free): Supabase Free pauses projects after
 * 7 days without activity — which would silently break "Ho bisogno di Adam".
 */
export async function GET(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "service role not configured" }, { status: 500 });
  const { error } = await admin.from("app_settings").select("key", { count: "exact", head: true });
  return NextResponse.json({ ok: !error, at: new Date().toISOString() }, { status: error ? 500 : 200 });
}
