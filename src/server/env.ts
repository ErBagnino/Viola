import "server-only";

// Server-only secrets. Read lazily so missing optional values never crash
// the build — every feature degrades gracefully when unconfigured.
// Trimmed: values pasted into a hosting dashboard often carry stray spaces/newlines.
const read = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
};

export const serverEnv = {
  get serviceRoleKey() {
    return read("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  },
  get geminiApiKey() {
    return read("GEMINI_API_KEY");
  },
  get geminiModel() {
    return read("GEMINI_MODEL");
  },
  get telegramBotToken() {
    return read("TELEGRAM_BOT_TOKEN");
  },
  get telegramChatId() {
    return read("TELEGRAM_ADMIN_CHAT_ID");
  },
  get vapidPrivateKey() {
    return read("VAPID_PRIVATE_KEY");
  },
  get vapidSubject() {
    return read("VAPID_SUBJECT") || "mailto:admin@example.com";
  },
  get whatsappNumber() {
    return read("ADMIN_WHATSAPP_NUMBER").replace(/\D/g, "");
  },
  get cronSecret() {
    return read("CRON_SECRET");
  },
  get siteUrl() {
    const explicit = read("NEXT_PUBLIC_SITE_URL");
    if (explicit) return explicit.replace(/\/$/, "");
    const vercel = read("VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL");
    return vercel ? `https://${vercel}` : "";
  },
};
