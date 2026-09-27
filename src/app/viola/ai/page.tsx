import { Chat } from "@/features/ai-chat/chat";
import { getSettings } from "@/server/settings";
import { getAiProfile } from "@/server/ai/profile";
import { isAiConfigured } from "@/server/ai/gemini";

export const metadata = { title: "Adam AI" };

export default async function AiPage({ searchParams }: PageProps<"/viola/ai">) {
  const [settings, sp] = await Promise.all([getSettings(), searchParams]);
  const profile = await getAiProfile(settings);
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
    />
  );
}
