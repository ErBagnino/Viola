import { Chat } from "@/features/ai-chat/chat";
import { getSettings } from "@/server/settings";
import { getAiProfile } from "@/server/ai/profile";
import { isAiConfigured } from "@/server/ai/gemini";
import { createViolaClient } from "@/server/viola-view";
import { loadRecentConversation } from "@/server/ai/history";

export const metadata = { title: "Adam AI" };

export default async function AiPage({ searchParams }: PageProps<"/viola/ai">) {
  const [settings, sp] = await Promise.all([getSettings(), searchParams]);
  const supabase = await createViolaClient();
  const q = typeof sp.q === "string" ? sp.q.slice(0, 200) : undefined;
  const [profile, { data: facts }, recent] = await Promise.all([
    getAiProfile(settings),
    // RLS returns only facts that are enabled AND marked visible to Viola
    supabase.from("ai_memory").select("key, value").eq("enabled", true).eq("visible_to_viola", true).order("category").limit(100),
    // coming back within a few hours: the chat is where she left it (a question from a button starts a new one)
    q ? null : loadRecentConversation(supabase, "viola"),
  ]);
  const available = settings.ai.enabled && isAiConfigured();
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
      initialConversation={recent}
    />
  );
}
