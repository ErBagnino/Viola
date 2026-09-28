"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Send, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, Textarea } from "@/components/ui/fields";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/utils/cn";
import { editBase, emptySession, sessionReducer } from "./session";
import { WRITING_LENGTHS, WRITING_TARGETS, WRITING_TONES, type WriteRequest, type WritingEvent, type WritingLength, type WritingTargetKey, type WritingTone } from "./targets";

// ---------------------------------------------------------------------------
// "✨ Genera con AI" under an editor. The AI never touches the editor by
// itself: its drafts appear here, next to Adam's text, and go into the editor
// only with "Usa questa" (and "Annulla" puts his text back). Every version of
// the session stays reachable with ‹ ›. Saving is still the form's "Salva".
// ---------------------------------------------------------------------------

const THINKING = ["Sto cercando le parole giuste…", "Sto pensando a come dirlo…", "Rileggo e sistemo…"];
const QUICK_EDITS = ["Più corta", "Più semplice", "Più romantica", "Più come parlo io"];
const OFFLINE = "Sei offline: l'AI non è raggiungibile. Il tuo testo è al sicuro.";

type Props = {
  target: WritingTargetKey;
  /** what is in the editor now */
  value: string;
  onApply: (text: string) => void;
  /** the other fields of the form (title, category…) */
  details?: Record<string, unknown>;
  /** replies: the message being answered */
  messageId?: string | null;
  messagePrivate?: boolean;
  /** the draft as Viola will see it */
  renderPreview?: (draft: string) => ReactNode;
  violaName?: string;
};

export function WritingAssistant({ target, value, onApply, details, messageId, messagePrivate, renderPreview, violaName = "Viola" }: Props) {
  const conf = WRITING_TARGETS[target];
  const [open, setOpen] = useState(false);
  const [s, dispatch] = useReducer(sessionReducer, undefined, emptySession);
  const [tone, setTone] = useState<WritingTone | null>(null);
  const [length, setLength] = useState<WritingLength | null>(null);
  const [hint, setHint] = useState("");
  const [instruction, setInstruction] = useState("");
  const [readMessage, setReadMessage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  /** tone / length / "cosa vuoi dirle" again, after the first draft */
  const [showSetup, setShowSetup] = useState(false);
  const [thinking, setThinking] = useState(0);
  const abort = useRef<AbortController | null>(null);
  // keyboard / VoiceOver: the button that opened or closed the panel disappears, so move focus
  const panelRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const last = useRef<{ mode: "generate" | "edit"; instruction?: string } | null>(null);
  const sessionRef = useRef(s);
  useEffect(() => {
    sessionRef.current = s;
  }, [s]);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!s.pending) return;
    const t = setInterval(() => setThinking((i) => (i + 1) % THINKING.length), 2600);
    return () => clearInterval(t);
  }, [s.pending]);

  const shown = s.versions[s.index] ?? null;
  const busy = Boolean(s.pending);

  async function request(mode: "generate" | "edit", editInstruction?: string) {
    const cur = sessionRef.current;
    if (cur.pending) return; // one request at a time
    last.current = { mode, instruction: editInstruction };
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      dispatch({ type: "start", mode, instruction: editInstruction });
      dispatch({ type: "fail", message: OFFLINE });
      return;
    }
    dispatch({ type: "start", mode, instruction: editInstruction });
    setThinking(0);
    // The session after "start" (same rules as the reducer), for the request body.
    const next = sessionReducer(cur, { type: "start", mode, instruction: editInstruction });
    const body: WriteRequest = {
      target,
      mode,
      tone,
      length,
      hint,
      current: value,
      draft: mode === "edit" ? editBase(cur, value) : "",
      previous: mode === "generate" ? (cur.versions[cur.versions.length - 1]?.text ?? "") : "",
      instruction: editInstruction ?? "",
      history: next.instructions.slice(0, editInstruction ? -1 : undefined),
      keep: next.keep,
      // only the fields this kind of text needs (title, category…), nothing else from the form
      details: Object.fromEntries(conf.details.filter((k) => details && k in details).map((k) => [k, details![k]])),
      messageId: readMessage && !messagePrivate ? (messageId ?? null) : null,
    };
    const ctrl = new AbortController();
    abort.current = ctrl;
    let finished = false;
    try {
      const res = await fetch("/api/admin/ai/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        dispatch({ type: "fail", message: `${j.error ?? "L'AI non risponde."} Il tuo testo è al sicuro.` });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(chunk, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let e: WritingEvent;
          try {
            e = JSON.parse(line) as WritingEvent;
          } catch {
            continue;
          }
          if (e.t === "text") dispatch({ type: "delta", v: e.v });
          else if (e.t === "reset") dispatch({ type: "reset" });
          else if (e.t === "done") {
            finished = true;
            dispatch({ type: "done", text: e.text, note: e.note, warning: e.warning });
            if (mode === "edit") setInstruction("");
            setShowPreview(false);
            setShowSetup(false);
          } else if (e.t === "error") {
            finished = true;
            dispatch({ type: "fail", message: e.message });
          }
        }
      }
      if (!finished) dispatch({ type: "fail", message: "La risposta si è interrotta. Riprova: il tuo testo è al sicuro." });
    } catch {
      if (ctrl.signal.aborted) dispatch({ type: "cancel" });
      else dispatch({ type: "fail", message: navigator.onLine === false ? OFFLINE : "Connessione persa. Riprova: il tuo testo è al sicuro." });
    } finally {
      if (abort.current === ctrl) abort.current = null;
    }
  }

  const sendEdit = (text: string) => {
    const t = text.trim();
    if (!t || busy || !(shown?.text || value.trim())) return;
    void request("edit", t);
  };

  const apply = () => {
    if (!shown) return;
    dispatch({ type: "applied", previous: value });
    onApply(shown.text);
  };
  const undo = () => {
    if (!s.applied) return;
    onApply(s.applied.previous);
    dispatch({ type: "undo" });
  };

  if (!open) {
    return (
      <div className="mt-2">
        <Button
          ref={openerRef}
          size="sm"
          variant="soft"
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => panelRef.current?.focus());
          }}
          aria-expanded={false}
        >
          <Sparkles className="size-4 text-rouge-500" /> {conf.button}
        </Button>
      </div>
    );
  }

  const letter = conf.layout === "letter";
  const hasText = Boolean(value.trim());
  const appliedHere = s.applied && shown && s.applied.versionId === shown.id;

  return (
    <section ref={panelRef} tabIndex={-1} className="mt-3 space-y-3 rounded-3xl border border-blush-200 bg-surface/80 p-4 outline-none" aria-label={`Assistente di scrittura: ${conf.button}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-extrabold text-vio-900">
          <Sparkles className="size-4 text-rouge-500" /> {conf.button}
        </h3>
        <button
          type="button"
          onClick={() => {
            abort.current?.abort();
            setOpen(false);
            requestAnimationFrame(() => openerRef.current?.focus());
          }}
          className="grid size-10 place-items-center rounded-xl text-ink-muted hover:bg-tint-50"
          aria-label="Chiudi l'assistente"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* ---- first request: tone, length, what to say (all optional) ----
           While the AI writes, everything stays where it is (disabled), so a
           second tap never lands on another button of the form. */}
      {(s.versions.length === 0 || showSetup) && (
        <fieldset disabled={busy} className="m-0 min-w-0 space-y-3 border-0 p-0">
          <div>
            <p className="mb-1.5 text-sm font-bold text-vio-800">Che tono? <span className="font-semibold text-ink-muted">(facoltativo)</span></p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tono">
              {(Object.keys(WRITING_TONES) as WritingTone[]).map((t) => (
                <Chip key={t} active={tone === t} onClick={() => setTone(tone === t ? null : t)}>
                  {WRITING_TONES[t]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-bold text-vio-800">Lunghezza</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Lunghezza">
              {(Object.keys(WRITING_LENGTHS) as WritingLength[]).map((l) => (
                <Chip key={l} active={(length ?? conf.defaultLength) === l} onClick={() => setLength(l)}>
                  {WRITING_LENGTHS[l]}
                </Chip>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-vio-800">
              {target === "memories.body" ? "Cosa ricordi di quel giorno?" : `Cosa vuoi dire a ${violaName}?`} <span className="font-semibold text-ink-muted">(facoltativo)</span>
            </span>
            <Textarea rows={2} value={hint} maxLength={800} onChange={(e) => setHint(e.target.value)} placeholder={conf.hintPlaceholder} />
          </label>
          {target === "messages.reply" && messageId && (
            <label className={cn("flex items-start gap-2 text-sm", messagePrivate ? "text-ink-muted" : "text-vio-800")}>
              <input type="checkbox" className="mt-1 size-4 accent-wine-600" checked={readMessage && !messagePrivate} disabled={messagePrivate} onChange={(e) => setReadMessage(e.target.checked)} />
              <span>{messagePrivate ? `Messaggio privato: non lo faccio leggere all'AI.` : `Fai leggere all'AI il messaggio di ${violaName} (solo per questa risposta).`}</span>
            </label>
          )}
          <p className="text-xs text-ink-muted">
            {hasText ? "Parto dal tuo testo: le tue idee e le tue frasi restano. " : ""}L&apos;AI non inventa ricordi: i dettagli veri li scegli tu.{" "}
            <Link href="/admin/ai#s-writing" className="font-bold text-vio-700 underline underline-offset-2">
              Il tuo stile
            </Link>
          </p>
          <Button className="w-full" loading={busy} onClick={() => void request("generate")}>
            <Sparkles className="size-4" /> {s.versions.length ? "Genera con queste indicazioni" : hasText ? "Migliora con l'AI" : "Genera"}
          </Button>
        </fieldset>
      )}

      {/* ---- the AI is writing ---- */}
      {busy && (
        <div className="flex items-center justify-between gap-2" aria-live="polite">
          <p className="text-sm font-bold text-vio-700">{THINKING[thinking]}</p>
          <Button size="sm" variant="ghost" onClick={() => abort.current?.abort()}>
            <Square className="size-3.5 fill-current" /> Ferma
          </Button>
        </div>
      )}
      {busy && !shown && (
        <div className={cn("rounded-2xl bg-cream-50 p-3 text-vio-900 opacity-80", letter ? "min-h-40" : "min-h-16")}>
          {s.streaming ? <Markdown>{s.streaming}</Markdown> : <span className="inline-block h-4 w-24 rounded bg-tint-100 motion-safe:animate-pulse" aria-hidden />}
        </div>
      )}

      {s.error && (
        <div className="space-y-2 rounded-2xl bg-blush-100 p-3" role="alert">
          <p className="text-sm font-bold text-rouge-600">{s.error}</p>
          {last.current && (
            <Button size="sm" variant="soft" onClick={() => last.current && void request(last.current.mode, last.current.instruction)}>
              Riprova
            </Button>
          )}
        </div>
      )}

      {/* ---- the draft on screen (stays in place while a new one is written) ---- */}
      {shown && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-vio-800">✨ {busy ? "Nuova bozza in arrivo…" : shown.kind === "edit" ? "Bozza modificata" : "Bozza generata"}</p>
            {s.versions.length > 1 && (
              <div className="flex items-center gap-1 text-xs font-bold text-ink-muted">
                <button type="button" className="grid size-9 place-items-center rounded-xl hover:bg-tint-50 disabled:opacity-30" onClick={() => dispatch({ type: "select", index: s.index - 1 })} disabled={busy || s.index === 0} aria-label="Versione precedente">
                  <ChevronLeft className="size-4" />
                </button>
                <span aria-live="polite">
                  {s.index + 1} di {s.versions.length}
                </span>
                <button type="button" className="grid size-9 place-items-center rounded-xl hover:bg-tint-50 disabled:opacity-30" onClick={() => dispatch({ type: "select", index: s.index + 1 })} disabled={busy || s.index === s.versions.length - 1} aria-label="Versione successiva">
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
          {renderPreview && !busy && (
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-tint-50 p-1" role="tablist" aria-label="Bozza o anteprima">
              {[false, true].map((p) => (
                <button key={String(p)} type="button" role="tab" aria-selected={showPreview === p} onClick={() => setShowPreview(p)} className={cn("h-9 rounded-xl text-sm font-extrabold", showPreview === p ? "bg-surface text-vio-900 shadow-soft" : "text-ink-soft")}>
                  {p ? `Come la vede ${violaName}` : "Testo"}
                </button>
              ))}
            </div>
          )}
          {busy ? (
            <div className="rounded-2xl bg-cream-50 p-3 text-vio-900 opacity-60" aria-busy>
              <Markdown>{s.streaming || shown.text}</Markdown>
            </div>
          ) : showPreview && renderPreview ? (
            <div className="rounded-2xl bg-cream-50 p-2">{renderPreview(shown.text)}</div>
          ) : (
            <div className="rounded-2xl bg-cream-50 p-3 text-vio-900" data-testid="ai-draft">
              <Markdown>{shown.text}</Markdown>
            </div>
          )}
          {shown.warning && !busy && <p className="rounded-xl bg-peach-100 px-3 py-2 text-sm font-bold text-vio-900">{shown.warning}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="sm:flex-1" onClick={apply} disabled={busy || Boolean(appliedHere)}>
              {appliedHere ? "✓ Nell'editor" : "Usa questa"}
            </Button>
            <Button variant="soft" className="sm:flex-1" onClick={() => void request("generate")} disabled={busy} loading={s.pending?.mode === "generate"}>
              Generane un&apos;altra
            </Button>
          </div>
          {!busy && !showSetup && (
            <button type="button" onClick={() => setShowSetup(true)} className="text-sm font-bold text-vio-700 underline underline-offset-2">
              Tono e indicazioni
            </button>
          )}
          {s.applied ? (
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft" role="status">
              ✓ Bozza inserita nell&apos;editor: ricordati di salvare.
              <button type="button" onClick={undo} className="font-bold text-vio-700 underline underline-offset-2">
                Annulla (rimetti il mio testo)
              </button>
            </p>
          ) : (
            hasText && <p className="text-xs text-ink-muted">Il tuo testo nell&apos;editor non cambia finché non tocchi «Usa questa».</p>
          )}
        </div>
      )}

      {/* ---- mini chat: change the draft (or Adam's own text) ---- */}
      {(shown || hasText) && (
        <div className="space-y-2 border-t border-blush-100 pt-3">
          <p className="text-sm font-extrabold text-vio-800">
            ✨ Modifica con AI <span className="font-semibold text-ink-muted">· {shown ? `la bozza ${s.index + 1}` : "il tuo testo"}</span>
          </p>
          {s.chat.length > 0 && (
            <ul className="space-y-1.5" aria-label="Conversazione con l'assistente">
              {s.chat.slice(-4).map((c, i) => (
                <li key={i} className={cn("w-fit max-w-[90%] rounded-2xl px-3 py-1.5 text-sm", c.from === "adam" ? "ml-auto bg-wine-700 text-white" : "bg-cream-50 text-vio-900")}>
                  <span className="sr-only">{c.from === "adam" ? "Tu: " : "Assistente: "}</span>
                  {c.text}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EDITS.map((q) => (
              <Chip key={q} onClick={() => sendEdit(q)} disabled={busy}>
                {q}
              </Chip>
            ))}
          </div>
          {/* not a <form>: the assistant lives inside the content form */}
          <div className="flex gap-2">
            <input
              value={instruction}
              maxLength={500}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault(); // never submit the content form
                  sendEdit(instruction);
                }
              }}
              placeholder="Es. «Falla più personale e meno formale»"
              aria-label="Cosa vuoi cambiare?"
              className="h-11 min-w-0 flex-1 rounded-2xl border border-blush-200 bg-surface px-3.5 text-[15px] text-ink outline-none focus:ring-2 focus:ring-wine-400"
            />
            <Button size="icon" onClick={() => sendEdit(instruction)} disabled={busy || !instruction.trim()} aria-label="Invia la richiesta all'AI">
              <Send className="size-4" />
            </Button>
          </div>
          {s.keep.length > 0 && (
            <p className="text-xs text-ink-muted">
              Frasi che resteranno identiche: {s.keep.map((k) => `«${k}»`).join(", ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
