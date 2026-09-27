export type AdminNavItem = { href: string; label: string; icon: string; group: string };

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "home", group: "Principale" },
  { href: "/admin/richieste", label: "Ho bisogno di Adam", icon: "heart-handshake", group: "Principale" },
  { href: "/admin/messaggi", label: "Messaggi", icon: "mail-heart", group: "Principale" },
  { href: "/admin/umore", label: "Umore", icon: "smile", group: "Principale" },
  { href: "/admin/copilot", label: "AI Copilot", icon: "wand", group: "Principale" },

  { href: "/admin/home", label: "Home", icon: "home", group: "Contenuti" },
  { href: "/admin/dediche", label: "Dediche", icon: "mail-heart", group: "Contenuti" },
  { href: "/admin/foto", label: "Foto e audio", icon: "images", group: "Contenuti" },
  { href: "/admin/ricordi", label: "Ricordi", icon: "book-heart", group: "Contenuti" },
  { href: "/admin/aprimi", label: "Open When", icon: "gift", group: "Contenuti" },
  { href: "/admin/countdown", label: "Countdown", icon: "hourglass", group: "Contenuti" },
  { href: "/admin/capsule", label: "Time capsule", icon: "alarm", group: "Contenuti" },
  { href: "/admin/sorprese", label: "Sorprese", icon: "sparkles", group: "Contenuti" },
  { href: "/admin/frasi", label: "Frasi", icon: "feather", group: "Contenuti" },
  { href: "/admin/quiz", label: "Quiz", icon: "trophy", group: "Contenuti" },
  { href: "/admin/audio", label: "Audio", icon: "headphones", group: "Contenuti" },

  { href: "/admin/comfort", label: "Comfort", icon: "sparkles", group: "Calma" },
  { href: "/admin/respirazione", label: "Respirazione", icon: "wind", group: "Calma" },
  { href: "/admin/grounding", label: "Grounding", icon: "footprints", group: "Calma" },

  { href: "/admin/ai", label: "Adam AI", icon: "bot-heart", group: "Sistema" },
  { href: "/admin/ai-memoria", label: "Memoria AI", icon: "lightbulb", group: "Sistema" },
  { href: "/admin/notifiche", label: "Notifiche", icon: "bell", group: "Sistema" },
  { href: "/admin/impostazioni", label: "Impostazioni", icon: "palette", group: "Sistema" },
  { href: "/admin/costi", label: "Cost control", icon: "target", group: "Sistema" },
  { href: "/admin/backup", label: "Import / Export", icon: "shuffle", group: "Sistema" },
  { href: "/admin/registro", label: "Registro", icon: "book", group: "Sistema" },
];

export const ADMIN_MOBILE_TABS = ["/admin", "/admin/richieste", "/admin/messaggi", "/admin/copilot"];
