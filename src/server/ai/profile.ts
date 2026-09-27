import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signOne } from "@/server/media";
import type { SettingsMap } from "@/features/settings/schema";
import type { ChatProfile } from "@/features/ai-chat/chat";

export async function getAiProfile(settings: SettingsMap): Promise<ChatProfile> {
  const p = settings.ai_profile;
  let avatarUrl: string | null = null;
  if (p.avatarMediaId) {
    const supabase = await createClient();
    const { data } = await supabase.from("media").select("*").eq("id", p.avatarMediaId).maybeSingle();
    avatarUrl = (await signOne(supabase, data))?.thumbUrl ?? null;
  }
  return { name: p.name, subtitle: p.subtitle, welcome: p.welcome, avatarUrl, signature: p.signature };
}
