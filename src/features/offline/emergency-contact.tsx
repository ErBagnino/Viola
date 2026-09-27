"use client";

import { useEffect } from "react";
import { MessageCircleHeart, Phone } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/utils/cn";

// Adam's direct contacts are remembered on the device while the app works, so
// the offline page and the error screens can still offer "call / write to
// Adam" when the app itself (or the connection) is not available.
const KEY = "vio:contact";

type Stored = { adamName: string; whatsappUrl: string | null; phoneUrl: string | null };

function parse(raw: string): Stored | null {
  try {
    const v = JSON.parse(raw) as Partial<Stored>;
    const safe = (u: unknown, prefix: RegExp) => (typeof u === "string" && prefix.test(u) ? u : null);
    const out = {
      adamName: typeof v.adamName === "string" ? v.adamName.slice(0, 40) : "Adam",
      whatsappUrl: safe(v.whatsappUrl, /^https:\/\/wa\.me\//),
      phoneUrl: safe(v.phoneUrl, /^tel:\+?[0-9]+$/),
    };
    return out.whatsappUrl || out.phoneUrl ? out : null;
  } catch {
    return null;
  }
}

/** Mounted in Viola's shell: keeps the device copy of Adam's contacts up to date. */
export function RememberContact(contact: Stored) {
  const value = JSON.stringify(contact);
  useEffect(() => {
    try {
      if (contact.whatsappUrl || contact.phoneUrl) localStorage.setItem(KEY, value);
    } catch {
      /* private mode: nothing to remember */
    }
  }, [value, contact.whatsappUrl, contact.phoneUrl]);
  return null;
}

/** "Chiama Adam / Scrivigli": works without the app, only needs the phone. */
export function EmergencyContact({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const [raw] = useLocalStorage(KEY, "");
  const c = raw ? parse(raw) : null;
  if (!c) return null;
  const base = "press flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold";
  return (
    <div className={cn("grid gap-2", className)}>
      {c.phoneUrl && (
        <a href={c.phoneUrl} className={cn(base, "bg-rouge-500 text-white")}>
          <Phone className="size-5" /> Chiama {c.adamName}
        </a>
      )}
      {c.whatsappUrl && (
        <a href={c.whatsappUrl} target="_blank" rel="noopener noreferrer" className={cn(base, tone === "dark" ? "bg-white/10 text-white" : "paper text-vio-800")}>
          <MessageCircleHeart className="size-5" /> Scrivi a {c.adamName}
        </a>
      )}
    </div>
  );
}
