"use server";

import { createClient } from "@/lib/supabase/server";
import { assertMember } from "@/server/auth";

export async function completeOnboarding() {
  const viewer = await assertMember();
  const supabase = await createClient();
  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", viewer.id);
}
