import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mediaByIds } from "@/server/media";

/** Signed thumbnails for the media_id of each row (for admin lists). */
export async function adminThumbs(rows: Record<string, unknown>[]): Promise<Record<string, string>> {
  const ids = rows.map((r) => r.media_id).filter((x): x is string => typeof x === "string");
  if (!ids.length) return {};
  const supabase = await createClient();
  const media = await mediaByIds(supabase, ids);
  const out: Record<string, string> = {};
  for (const [id, m] of media) if (m.kind === "image") out[id] = m.thumbUrl;
  return out;
}
