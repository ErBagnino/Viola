"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";

export async function markOpenWhenOpened(id: string) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "user" || !z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_open_when_opened", { card_id: id });
}
