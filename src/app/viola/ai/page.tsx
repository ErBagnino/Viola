import { Chat } from "@/features/ai-chat/chat";
import { getSettings } from "@/server/settings";
import { getAiProfile } from "@/server/ai/profile";
import { isAiConfigured } from "@/server/ai/gemini";
import { createViolaClient } from "@/server/viola-view";

export const metadata = { title: "Adam AI" };

export default async function AiPage({ searchParams }: PageProps<"/viola/ai">) {
  const [settings, sp] = await Promise.all([getSettings(), searchParams]);
  const supabase = await createViolaClient();
  const [profile, { data: facts }] = await Promise.all([
    getAiProfile(settings),
    // RLS returns only facts that are enabled AND marked visible to Viola
    supabase.from("ai_memory").select("key, value").eq("enabled", true).eq("visible_to_viola", true).order("category").limit(100),
  ]);
  const available = settings.ai.enabled && isAiConfigured();
  const q = typeof sp.q === "string" ? sp.q.slice(0, 200) : undefined;
  return (
    <Chat
      scope="viola"
      endpoint="/api/ai/chat"
      profile={profile}
      quickActions={settings.ai_profile.quickActions}
      defaultMode={settings.ai.defaultMode}
      initialQuestion={q}
      available={available}
      unavailableText={settings.texts.aiOffline}
      showModes
      knownFacts={facts ?? []}
    />
  );
}
