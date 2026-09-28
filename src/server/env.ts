import "server-only";

// Server-only secrets. Read lazily so missing optional values never crash
// the build — every feature degrades gracefully when unconfigured.
// Cleaned: values pasted into a hosting dashboard often carry stray
// spaces/newlines, surrounding quotes ("AIza…") or the whole "NAME=value" line.
export function cleanEnvValue(name: string, value: string | undefined) {
  let v = (value ?? "").trim();
  if (v.startsWith(`${name}=`)) v = v.slice(name.length + 1).trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) v = v.slice(1, -1).trim();
  return v;
}

const read = (...names: string[]) => {
  for (const name of names) {
    const value = cleanEnvValue(name, process.env[name]);
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
