"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Copy, HeartHandshake, History, ImagePlus, Lightbulb, MessageSquarePlus, RefreshCw, Square, Trash2, WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useNeedAdamShortcut } from "@/components/layout/shell-context";
import { Markdown } from "@/components/ui/markdown";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { HeartFlower } from "@/components/decor/stars";
import { cn } from "@/utils/cn";
import { relativeTime } from "@/utils/dates";
import { compressImage, uploadPhoto } from "@/features/admin/fields/image-compress";
import { deleteAiMessage, deleteConversation, listConversations, loadConversation } from "./actions";
import { ActionCard } from "./action-cards";
import type { ChatAction, ChatMessage, ConversationSummary, StreamEvent } from "./types";
import { callAction } from "@/utils/call-action";

export type ChatProfile = { name: string; subtitle: string; welcome: string; avatarUrl: string | null; signature?: string };
type Mode = "general" | "personal" | "comfort";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "general", label: "Generale", hint: "Chiedimi qualsiasi cosa" },
  { value: "personal", label: "Personale", hint: "Uso quello che Adam mi ha insegnato" },
  { value: "comfort", label: "Conforto", hint: "Più piano, più morbido" },
];

/** In Comfort mode these open the app's calming tools directly: no typing, no waiting, work even if the AI is down. */
const COMFORT_LINKS = [
  { label: "Respira con me", href: "/viola/calma/respira?via=1" },
  { label: "Facciamo grounding", href: "/viola/calma/grounding" },
  { label: "5-4-3-2-1", href: "/viola/calma/54321" },
  { label: "Fammi vedere una foto", href: "/viola/noi/foto/random" },
  { label: "Apriamo un ricordo", href: "/viola/noi/ricordi" },
  { label: "Scrivi ad Adam", href: "/viola/scrivi" },
  { label: "Ho bisogno di Adam", href: "/viola/adam" },
];

function Avatar({ url, size = "sm" }: { url: string | null; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "size-20 rounded-[1.75rem]" : "size-8 rounded-xl";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={cn(cls, "shrink-0 object-cover shadow-soft")} />
  ) : (
    <span className={cn(cls, "grid shrink-0 place-items-center bg-black shadow-soft")}>
      <HeartFlower className={size === "lg" ? "size-14" : "size-6"} color="#da0e14" strokeWidth={46} />
    </span>
  );
}

function Typing() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Sta scrivendo">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="size-2 rounded-full bg-wine-400" animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, delay: i * 0.15, repeat: Infinity }} />
      ))}
    </span>
  );
}

export function Chat({
  scope,
  endpoint,
  profile,
  quickActions,
  defaultMode = "general",
  initialQuestion,
  available,
  unavailableText,
  showModes,
  allowAttachments,
  knownFacts,
}: {
  scope: "viola" | "copilot";
  endpoint: string;
  profile: ChatProfile;
  quickActions: string[];
  defaultMode?: Mode;
  initialQuestion?: string;
  available: boolean;
  unavailableText: string;
  showModes?: boolean;
  allowAttachments?: boolean;
  /** facts Adam taught the AI and chose to show to Viola */
  knownFacts?: { key: string; value: string }[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [streaming, setStreaming] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [factsOpen, setFactsOpen] = useState(false);
  const [history, setHistory] = useState<ConversationSummary[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const needAdam = useNeedAdamShortcut();
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const askedInitial = useRef(false);

  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  // Smooth auto-scroll while streaming, unless she scrolled up to read.
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, waiting]);

  const patchLast = useCallback((fn: (m: ChatMessage) => ChatMessage) => {
    setMessages((ms) => {
      const copy = [...ms];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === "model") {
          copy[i] = fn(copy[i]);
          break;
        }
      }
      return copy;
    });
  }, []);

  const send = useCallback(
    async (text: string, opts: { regenerate?: boolean } = {}) => {
      if (streaming) return;
      if (!opts.regenerate && !text.trim()) return;
      const now = new Date().toISOString();
      const modelMsg: ChatMessage = { id: `tmp-m-${Date.now()}`, role: "model", content: "", actions: [], status: "ok", createdAt: now };
      setMessages((ms) => {
        let base = ms;
        if (opts.regenerate) {
          const lastUser = ms.map((m) => m.role).lastIndexOf("user");
          base = ms.slice(0, lastUser + 1);
        } else base = [...ms, { id: `tmp-u-${Date.now()}`, role: "user", content: text.trim(), actions: [], status: "ok", createdAt: now }];
        return [...base, modelMsg];
      });
      setInput("");
      setStreaming(true);
      setWaiting(true);
      stick.current = true;
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message: text.trim(), mode, regenerate: Boolean(opts.regenerate) }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: unavailableText }));
          patchLast((m) => ({ ...m, content: err.error ?? unavailableText, status: "error" }));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let finished = false;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            let e: StreamEvent;
            try {
              e = JSON.parse(line);
            } catch {
              continue;
            }
            if (e.t === "meta") setConversationId(e.conversationId);
            else if (e.t === "text") {
              setWaiting(false);
              patchLast((m) => ({ ...m, content: m.content + e.v }));
            } else if (e.t === "action") {
              setWaiting(false);
              patchLast((m) => ({ ...m, actions: [...m.actions, e.action] }));
            } else if (e.t === "done") {
              finished = true;
              patchLast((m) => ({ ...m, id: e.messageId ?? m.id }));
            } else if (e.t === "error") {
              finished = true;
              patchLast((m) => ({ ...m, content: m.content ? `${m.content}\n\n_${e.message}_` : e.message, status: "error" }));
            }
          }
        }
        // The server went away mid-answer (timeout, lost connection): say so instead of leaving a blank bubble.
        if (!finished) patchLast((m) => ({ ...m, content: m.content ? `${m.content}\n\n_${unavailableText}_` : unavailableText, status: "error" }));
      } catch {
        if (ctrl.signal.aborted) patchLast((m) => ({ ...m, status: "stopped" }));
        else patchLast((m) => ({ ...m, content: m.content || unavailableText, status: "error" }));
      } finally {
        setStreaming(false);
        setWaiting(false);
        abort.current = null;
      }
    },
    [streaming, endpoint, conversationId, mode, patchLast, unavailableText],
  );

  useEffect(() => {
    if (initialQuestion && !askedInitial.current && available) {
      askedInitial.current = true;
      send(initialQuestion);
    }
  }, [initialQuestion, available, send]);

  const stop = () => abort.current?.abort();

  const newChat = () => {
    stop();
    setMessages([]);
    setConversationId(null);
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    const r = await callAction(() => listConversations(scope));
    if (r.ok) setHistory(r.items);
    else {
      setHistory([]);
      toast.show(r.error, "error");
    }
  };

  const openConversation = async (id: string) => {
    const r = await callAction(() => loadConversation(id, scope));
    if (!r.ok) return toast.show(r.error, "error");
    setMessages(r.messages);
    setConversationId(id);
    if (MODES.some((m) => m.value === r.mode)) setMode(r.mode as Mode);
    setHistoryOpen(false);
  };

  const confirmAction = async (logId: string, decision: "confirm" | "reject") => {
    const res = await fetch("/api/admin/ai/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logId, decision }) });
    const json = await res.json().catch(() => ({}));
    const state = decision === "confirm" && json.ok ? "confirmed" : "rejected";
    setMessages((ms) => [
      ...ms.map((m) => ({ ...m, actions: m.actions.map((a: ChatAction) => (a.type === "confirm" && a.logId === logId ? { ...a, state } : a)) })) as ChatMessage[],
      { id: `note-${Date.now()}`, role: "note", content: json.summary ? `${json.ok ? "✓" : "✗"} ${json.summary}` : (json.error ?? "Annullato"), actions: [], status: "ok", createdAt: new Date().toISOString() },
    ]);
    if (!res.ok) toast.show(json.error ?? "Errore", "error");
  };

  const attach = async (file: File) => {
    setAttaching(true);
    try {
      const blob = await compressImage(file);
      const res = await uploadPhoto(blob, file.name, { contexts: ["gallery"], visibility: "shared", title: file.name.replace(/\.[^.]+$/, "") });
      if (res.error || !res.media) throw new Error(res.error ?? "Caricamento non riuscito");
      setInput((t) => `${t}${t ? "\n" : ""}[Foto allegata: media_id=${res.media!.id}] `);
      toast.show("Foto caricata: ora dimmi cosa farne ♡");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Errore", "error");
    } finally {
      setAttaching(false);
    }
  };

  const lastModelIndex = messages.map((m) => m.role).lastIndexOf("model");

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] flex-col lg:h-[calc(100dvh-4rem)]">
      {/* header */}
      <div className="flex items-center gap-3 pb-3">
        <Avatar url={profile.avatarUrl} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl leading-tight font-semibold text-vio-900">{profile.name}</h1>
          <p className="truncate text-xs text-ink-soft">{profile.subtitle}</p>
        </div>
        {knownFacts && (
          <Button size="icon" variant="ghost" onClick={() => setFactsOpen(true)} aria-label={`Cosa sa ${profile.name}`}>
            <Lightbulb className="size-5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={openHistory} aria-label="Conversazioni precedenti">
          <History className="size-5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={newChat} aria-label="Nuova conversazione">
          <MessageSquarePlus className="size-5" />
        </Button>
        {needAdam && (
          <Link href={needAdam} className="press grid size-11 shrink-0 place-items-center rounded-2xl text-rouge-500 hover:bg-tint-50" aria-label="Ho bisogno di Adam" title="Ho bisogno di Adam">
            <HeartHandshake className="size-5" />
          </Link>
        )}
      </div>

      {showModes && (
        <div role="radiogroup" aria-label="Modalità" className="mb-2 flex gap-1 rounded-2xl bg-tint-50 p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              title={m.hint}
              onClick={() => setMode(m.value)}
              className={cn("press min-h-10 flex-1 rounded-xl py-2 text-sm font-extrabold", mode === m.value ? "bg-surface text-vio-800 shadow-soft" : "text-vio-600")}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* messages */}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="no-scrollbar -mx-1 flex-1 space-y-4 overflow-y-auto px-1 py-2"
        aria-live="polite"
      >
        {(!available || offline) && (
          <div className="paper rounded-3xl p-4 text-center">
            <WifiOff className="mx-auto size-6 text-vio-500" />
            <p className="mt-2 font-bold text-vio-900">{unavailableText}</p>
            {scope === "viola" && (
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
                <Link href="/viola/calma/respira" className="rounded-full bg-lilac-100 px-3 py-1.5 font-bold text-lilac-600">
                  Respira
                </Link>
                <Link href="/viola/calma/54321" className="rounded-full bg-lilac-100 px-3 py-1.5 font-bold text-lilac-600">
                  5-4-3-2-1
                </Link>
                <Link href="/viola/calma/aiutami" className="rounded-full bg-lilac-100 px-3 py-1.5 font-bold text-lilac-600">
                  Aiutami adesso
                </Link>
              </div>
            )}
          </div>
        )}

        {messages.length === 0 && available && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center pt-6 text-center">
            <Avatar url={profile.avatarUrl} size="lg" />
            <p className="mt-4 max-w-xs font-display text-2xl leading-snug text-vio-900">{profile.welcome}</p>
            {profile.signature && <p className="mt-1 font-hand text-xl text-vio-500">{profile.signature}</p>}
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            if (m.role === "note")
              return (
                <motion.p key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs font-bold text-ink-muted">
                  {m.content}
                </motion.p>
              );
            const mine = m.role === "user";
            const isLast = i === lastModelIndex;
            const pending = streaming && isLast;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("group flex gap-2", mine && "justify-end")}>
                {!mine && <Avatar url={profile.avatarUrl} />}
                <div className={cn("flex max-w-[85%] min-w-0 flex-col gap-2", mine && "items-end")}>
                  {(m.content || (pending && waiting)) && (
                    <div
                      data-role={m.role}
                      data-status={m.status}
                      className={cn(
                        "rounded-3xl px-4 py-2.5 text-[15.5px] leading-relaxed break-words",
                        mine ? "rounded-br-lg bg-wine-700 text-white" : "rounded-bl-lg bg-surface text-ink shadow-soft",
                        m.status === "error" && "bg-blush-100 text-vio-900",
                      )}
                    >
                      {mine ? <p className="whitespace-pre-wrap">{m.content}</p> : m.content ? <Markdown className="prose-vio [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{m.content}</Markdown> : <Typing />}
                      {m.status === "stopped" && <p className="mt-1 text-xs text-ink-muted italic">(interrotto)</p>}
                    </div>
                  )}
                  {m.actions.length > 0 && (
                    <div className="flex flex-col items-start gap-2">
                      {m.actions.map((a, k) => (
                        <ActionCard key={k} action={a} onConfirm={confirmAction} />
                      ))}
                    </div>
                  )}
                  {!pending && m.content && (
                    <div className={cn("flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100", mine && "justify-end")}>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(m.content).then(() => toast.show("Copiato ♡", "info"))}
                        className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-surface"
                        aria-label="Copia"
                      >
                        <Copy className="size-4" />
                      </button>
                      {!mine && isLast && !streaming && (
                        <button type="button" onClick={() => send("", { regenerate: true })} className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-surface" aria-label="Rigenera risposta">
                          <RefreshCw className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          setMessages((ms) => ms.filter((x) => x.id !== m.id));
                          if (!m.id.startsWith("tmp-")) await callAction(() => deleteAiMessage(m.id));
                        }}
                        className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-surface"
                        aria-label="Elimina messaggio"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* quick actions */}
      {scope === "viola" && mode === "comfort" ? (
        <nav aria-label="Cose che puoi fare adesso" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-2">
          {COMFORT_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={cn("press inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold whitespace-nowrap", l.href === "/viola/adam" ? "bg-rouge-500 text-white" : "border border-blush-200 bg-surface/80 text-vio-700")}>
              {l.label}
            </Link>
          ))}
        </nav>
      ) : (
        available &&
        !streaming && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-2">
            {quickActions.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="press min-h-11 shrink-0 rounded-full border border-blush-200 bg-surface/80 px-4 text-sm font-bold whitespace-nowrap text-vio-700">
                {q}
              </button>
            ))}
          </div>
        )
      )}

      {/* composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="paper flex items-end gap-2 rounded-[1.75rem] p-2"
      >
        {allowAttachments && (
          <>
            <button type="button" onClick={() => fileInput.current?.click()} disabled={attaching || streaming} className="grid size-11 shrink-0 place-items-center rounded-2xl text-vio-600 hover:bg-tint-50 disabled:opacity-40" aria-label="Allega una foto">
              <ImagePlus className="size-5" />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) attach(f);
                e.target.value = "";
              }}
            />
          </>
        )}
        <label htmlFor={`chat-input-${scope}`} className="sr-only">
          Scrivi un messaggio
        </label>
        <textarea
          id={`chat-input-${scope}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          maxLength={4000}
          disabled={!available}
          placeholder={available ? (scope === "viola" ? "Scrivimi qualsiasi cosa…" : "Es. crea tre dediche per quando è triste") : ""}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-ink placeholder:text-ink-muted/70 focus:outline-none"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
        {streaming ? (
          <button type="button" onClick={stop} className="press grid size-11 shrink-0 place-items-center rounded-2xl bg-wine-800 text-white" aria-label="Interrompi">
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button type="submit" disabled={!input.trim() || !available} className="press grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-wine-500 to-wine-700 text-white disabled:opacity-40" aria-label="Invia">
            <ArrowUp className="size-5" />
          </button>
        )}
      </form>

      {knownFacts && (
        <Sheet open={factsOpen} onClose={() => setFactsOpen(false)} title={`Cosa sa ${profile.name} di voi`}>
          <p className="text-sm text-ink-soft">{profile.name} usa solo quello che Adam gli ha insegnato. Non inventa ricordi: se non sa una cosa, te lo dice.</p>
          {knownFacts.length === 0 ? (
            <p className="mt-4 text-ink-muted">Per ora niente di personale.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {knownFacts.map((f, i) => (
                <li key={i} className="rounded-2xl bg-surface px-4 py-3">
                  <p className="text-xs font-extrabold tracking-widest text-vio-500 uppercase">{f.key}</p>
                  <p className="text-vio-900">{f.value}</p>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      )}

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Conversazioni">
        {!history ? (
          <p className="py-6 text-center text-ink-muted">Carico…</p>
        ) : history.length === 0 ? (
          <p className="py-6 text-center text-ink-muted">Nessuna conversazione salvata.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-2xl bg-surface p-2 pl-4">
                <button type="button" onClick={() => openConversation(c.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-bold text-vio-900">{c.title || "Conversazione"}</span>
                  <span className="text-xs text-ink-muted">
                    {relativeTime(c.updatedAt)} · {c.mode}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Elimina conversazione"
                  className="grid size-9 place-items-center rounded-xl text-ink-muted hover:bg-tint-50"
                  onClick={async () => {
                    const res = await callAction(() => deleteConversation(c.id));
                    if (!res.ok) return toast.show(res.error, "error");
                    setHistory((h) => (h ?? []).filter((x) => x.id !== c.id));
                    if (c.id === conversationId) newChat();
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
