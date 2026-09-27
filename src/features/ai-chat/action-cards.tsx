"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/dates";
import { cn } from "@/utils/cn";
import type { ChatAction } from "./types";

function Go({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return /^(https?:|tel:)/.test(href) ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function ActionCard({ action, onConfirm }: { action: ChatAction; onConfirm?: (logId: string, decision: "confirm" | "reject") => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  switch (action.type) {
    case "link":
      return (
        <Go href={action.href} className="press flex items-center gap-3 rounded-2xl bg-gradient-to-br from-wine-600 to-wine-800 px-4 py-3 text-white shadow-soft">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
            <Icon name={action.icon} className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-extrabold">{action.title}</span>
            {action.subtitle && <span className="block truncate text-xs text-white/75">{action.subtitle}</span>}
          </span>
        </Go>
      );
    case "photo":
      return action.url ? (
        <figure className="w-56 -rotate-1 rounded-md bg-white p-2 pb-3 shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={action.url} alt={action.title ?? "Foto"} className="aspect-square w-full rounded-sm object-cover" />
          <figcaption className="mt-1.5 text-center">
            <span className="block font-hand text-lg text-wine-800">{action.title || "Noi ♡"}</span>
            {action.date && <span className="text-[11px] text-ink-muted">{formatDate(action.date)}</span>}
          </figcaption>
        </figure>
      ) : null;
    case "memory":
      return (
        <Link href="/viola/noi/ricordi" className="press block w-full max-w-xs overflow-hidden rounded-2xl bg-white shadow-soft">
          {action.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={action.url} alt="" className="aspect-video w-full object-cover" />
          )}
          <span className="block p-3">
            <span className="block text-[11px] font-extrabold tracking-widest text-wine-500 uppercase">Ricordo{action.date ? ` · ${formatDate(action.date)}` : ""}</span>
            <span className="block font-display font-semibold text-wine-900">{action.title}</span>
            <span className="line-clamp-3 block text-sm text-ink-soft">{action.excerpt}</span>
          </span>
        </Link>
      );
    case "dedication":
      return (
        <Link href="/viola/noi/dediche" className="press block w-full max-w-xs rounded-2xl bg-gradient-to-br from-blush-100 to-cream-50 p-4 shadow-soft">
          <span className="block text-[11px] font-extrabold tracking-widest text-wine-500 uppercase">Una dedica</span>
          <span className="block font-display font-semibold text-wine-900">{action.title}</span>
          <span className="mt-1 line-clamp-4 block text-sm whitespace-pre-line text-ink-soft">{action.excerpt.replace(/[#*_>`]/g, "")}</span>
          <span className="mt-2 block text-right font-hand text-lg text-wine-600">{action.signature}</span>
        </Link>
      );
    case "tool":
      return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", action.ok ? "bg-green-100 text-green-800" : "bg-blush-100 text-wine-800")}>
          {action.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />} {action.summary}
        </span>
      );
    case "confirm":
      return (
        <div className="w-full max-w-sm rounded-2xl border-2 border-peach-300 bg-peach-100 p-3">
          <p className="text-sm font-bold text-wine-900">{action.summary}</p>
          {action.state === "pending" ? (
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="danger"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  await onConfirm?.(action.logId, "confirm");
                  setBusy(false);
                }}
              >
                Conferma
              </Button>
              <Button size="sm" variant="soft" disabled={busy} onClick={() => onConfirm?.(action.logId, "reject")}>
                Annulla
              </Button>
            </div>
          ) : (
            <p className="mt-1 text-xs font-bold text-ink-soft">{action.state === "confirmed" ? "✓ Confermato" : "Annullato"}</p>
          )}
        </div>
      );
  }
}
