import { Chat } from "@/features/ai-chat/chat";
import { getSettings } from "@/server/settings";
import { isAiConfigured } from "@/server/ai/gemini";

export const metadata = { title: "AI Copilot" };

export default async function CopilotPage() {
  const settings = await getSettings();
  const available = settings.ai.copilotEnabled && isAiConfigured();
  return (
    <Chat
      scope="copilot"
      endpoint="/api/admin/ai/chat"
      profile={{
        name: "Adam AI Copilot",
        subtitle: "Gestisco i contenuti per te, con strumenti sicuri",
        welcome: "Ciao Adam. Dimmi cosa vuoi creare o modificare: dediche, ricordi, countdown, frasi, foto…",
        avatarUrl: null,
      }}
      quickActions={[
        "Crea una nuova dedica",
        "Aggiungi una comfort action",
        "Fammi vedere le ultime richieste",
        "Crea un countdown",
        "Crea cinque messaggi buongiorno",
        "Crea una nuova modalità di respirazione",
        "Leggi i messaggi non letti",
      ]}
      available={available}
      unavailableText={isAiConfigured() ? "Il Copilot è disattivato nelle impostazioni AI." : "Manca GEMINI_API_KEY: segui SETUP.md per attivarla (gratis)."}
      allowAttachments
    />
  );
}
