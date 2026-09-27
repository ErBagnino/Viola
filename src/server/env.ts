import "server-only";

// Server-only secrets. Read lazily so missing optional values never crash
// the build — every feature degrades gracefully when unconfigured.
export const serverEnv = {
  get serviceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
  },
  get geminiApiKey() {
    return process.env.GEMINI_API_KEY ?? "";
  },
  get geminiModel() {
    return process.env.GEMINI_MODEL ?? "";
  },
  get telegramBotToken() {
    return process.env.TELEGRAM_BOT_TOKEN ?? "";
  },
  get telegramChatId() {
    return process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";
  },
  get vapidPrivateKey() {
    return process.env.VAPID_PRIVATE_KEY ?? "";
  },
  get vapidSubject() {
    return process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  },
  get whatsappNumber() {
    return (process.env.ADMIN_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get siteUrl() {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL;
    if (explicit) return explicit.replace(/\/$/, "");
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
    return vercel ? `https://${vercel}` : "";
  },
};
