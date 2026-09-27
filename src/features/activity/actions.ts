"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";

const schema = z.object({
  type: z.string().regex(/^[a-z0-9_]{2,60}$/),
  payload: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional(),
});

/** Fire-and-forget usage event (e.g. breathing_completed). Minimal data only. */
export async function logActivity(type: string, payload?: Record<string, string | number | boolean | null>) {
  try {
    const viewer = await getViewer();
    // Only Viola's usage is recorded, and only if she lets Adam see it.
    if (!viewer || viewer.role !== "user" || !viewer.shareActivity) return;
    const parsed = schema.safeParse({ type, payload });
    if (!parsed.success) return;
    const supabase = await createClient();
    await supabase.from("activity_events").insert({ type: parsed.data.type, payload: parsed.data.payload ?? {} });
  } catch {
    /* never block the UI */
  }
}
