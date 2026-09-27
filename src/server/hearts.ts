import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { HeartState } from "@/features/hearts/heart-exchange";

/** Hearts received (unseen) from the other person and the last one I sent. */
export async function getHeartState(viewerId: string): Promise<HeartState> {
  const supabase = await createClient();
  const [received, lastReceived, lastSent] = await Promise.all([
    supabase.from("hearts").select("id", { count: "exact", head: true }).neq("from_user", viewerId).is("seen_at", null),
    supabase.from("hearts").select("created_at").neq("from_user", viewerId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("hearts").select("created_at").eq("from_user", viewerId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return { unseen: received.count ?? 0, lastReceivedAt: lastReceived.data?.created_at ?? null, lastSentAt: lastSent.data?.created_at ?? null };
}
