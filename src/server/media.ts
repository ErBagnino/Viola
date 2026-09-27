import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Tables } from "@/db/database.types";

export type MediaRow = Tables<"media">;

export type MediaView = {
  id: string;
  kind: "image" | "audio";
  url: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
  title: string | null;
  caption: string | null;
  takenOn: string | null;
  category: string | null;
  tags: string[];
  featured: boolean;
  mime: string;
  duration: number | null;
};

const SIGN_TTL = 60 * 60 * 3; // 3 hours

/** Creates short-lived signed URLs for private media (RLS-checked). */
export async function signMedia(supabase: ServerSupabase, rows: (MediaRow | null | undefined)[]): Promise<MediaView[]> {
  const list = rows.filter((r): r is MediaRow => Boolean(r));
  if (!list.length) return [];
  const paths = Array.from(new Set(list.flatMap((r) => [r.path, r.thumb_path].filter(Boolean) as string[])));
  const { data } = await supabase.storage.from("media").createSignedUrls(paths, SIGN_TTL);
  const urls = new Map<string, string>();
  for (const d of data ?? []) if (d.signedUrl && d.path) urls.set(d.path, d.signedUrl);
  return list
    .map((r) => {
      const url = urls.get(r.path);
      if (!url) return null;
      return {
        id: r.id,
        kind: r.kind === "audio" ? "audio" : "image",
        url,
        thumbUrl: (r.thumb_path && urls.get(r.thumb_path)) || url,
        width: r.width,
        height: r.height,
        title: r.title,
        caption: r.caption,
        takenOn: r.taken_on,
        category: r.category,
        tags: r.tags ?? [],
        featured: r.featured,
        mime: r.mime,
        duration: r.duration_seconds === null ? null : Number(r.duration_seconds),
      } satisfies MediaView;
    })
    .filter((m): m is MediaView => m !== null);
}

export async function signOne(supabase: ServerSupabase, row: MediaRow | null | undefined) {
  const [m] = await signMedia(supabase, [row]);
  return m ?? null;
}

/** Loads media rows by id and signs them, preserving the requested order. */
export async function mediaByIds(supabase: ServerSupabase, ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (!unique.length) return new Map<string, MediaView>();
  const { data } = await supabase.from("media").select("*").in("id", unique);
  const signed = await signMedia(supabase, data ?? []);
  return new Map(signed.map((m) => [m.id, m]));
}
