"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { Lock, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Textarea } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { MOODS } from "@/features/content/constants";
import { formatDateTime } from "@/utils/dates";
import { cn } from "@/utils/cn";
import { deleteJournal, saveJournal } from "./actions";

export type JournalEntry = { id: string; title: string | null; body: string; mood: number | null; visibility: "private" | "shared"; createdAt: string };

type Draft = { id?: string; title: string; body: string; mood: number | null; visibility: "private" | "shared" };
const EMPTY: Draft = { title: "", body: "", mood: null, visibility: "private" };

export function Journal({ entries, adamName, tz }: { entries: JournalEntry[]; adamName: string; tz: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  const save = () =>
    start(async () => {
      if (!draft) return;
      const res = await saveJournal(draft);
      if (res.ok) {
        toast.show(draft.visibility === "shared" ? `Salvato e condiviso con ${adamName} ♡` : "Salvato, solo per te 🔒");
        setDraft(null);
      } else toast.show(res.error, "error");
    });

  return (
    <div>
      <Button size="lg" className="w-full" onClick={() => setDraft(EMPTY)}>
        <Plus className="size-5" /> Scrivi una nuova pagina
      </Button>

      <div className="mt-5 space-y-3">
        {entries.length === 0 && <EmptyState title="Il diario è vuoto" text="Qui puoi scrivere tutto. Di default resta solo tuo." />}
        <AnimatePresence>
          {entries.map((e) => (
            <motion.article key={e.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} className="paper rounded-[1.75rem] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink-muted">{formatDateTime(e.createdAt, tz)}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold", e.visibility === "shared" ? "bg-blush-100 text-wine-700" : "bg-cream-200 text-ink-soft")}>
                  {e.visibility === "shared" ? (
                    <>
                      <Share2 className="size-3" /> Condivisa
                    </>
                  ) : (
                    <>
                      <Lock className="size-3" /> Privata
                    </>
                  )}
                </span>
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold text-wine-900">
                {e.mood ? `${MOODS[e.mood - 1]?.emoji} ` : ""}
                {e.title || "Senza titolo"}
              </h3>
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-[15px] text-ink-soft">{e.body}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="soft" onClick={() => setDraft({ id: e.id, title: e.title ?? "", body: e.body, mood: e.mood, visibility: e.visibility })}>
                  <Pencil className="size-4" /> Apri
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(e.id)} aria-label="Elimina">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <Sheet open={Boolean(draft)} onClose={() => setDraft(null)} title={draft?.id ? "La tua pagina" : "Dimmi tutto."}>
        {draft && (
          <div className="space-y-4">
            <Field label="Titolo (facoltativo)">{(id) => <Input id={id} value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}</Field>
            <Field label="Cosa hai dentro?">
              {(id) => <Textarea id={id} rows={9} value={draft.body} maxLength={20000} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Scrivi tutto quello che vuoi…" />}
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-bold text-wine-800">Come ti senti? (facoltativo)</p>
              <div className="flex gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, mood: draft.mood === m.value ? null : m.value })}
                    aria-pressed={draft.mood === m.value}
                    aria-label={m.label}
                    className={cn("grid size-11 place-items-center rounded-2xl text-2xl", draft.mood === m.value ? "bg-wine-100 ring-2 ring-wine-400" : "bg-white")}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
            </div>
            <Segmented
              label="Visibilità"
              value={draft.visibility}
              onChange={(v) => setDraft({ ...draft, visibility: v })}
              options={[
                { value: "private", label: "🔒 Solo per me" },
                { value: "shared", label: `♡ Condividi con ${adamName}` },
              ]}
            />
            <Button size="lg" className="w-full" loading={pending} onClick={save} disabled={!draft.body.trim()}>
              Salva
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Eliminare questa pagina?">
        <p className="text-ink-soft">Verrà cancellata per sempre.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="soft" className="flex-1" onClick={() => setConfirm(null)}>
            No
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={pending}
            onClick={() =>
              start(async () => {
                if (!confirm) return;
                const res = await deleteJournal(confirm);
                if (!res.ok) toast.show(res.error, "error");
                setConfirm(null);
              })
            }
          >
            Elimina
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
