"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, CheckSquare, Lock, Music, Pencil, Trash2, Wind, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input, Segmented, Switch } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { MEDIA_CATEGORY_SUGGESTIONS, MEDIA_CONTEXTS } from "@/features/content/constants";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/dates";
import { deleteResourceAction, updateResourceAction } from "./actions";
import { ImageUploader } from "./fields/uploaders";
import { AudioCapture } from "./fields/audio-capture";
import { ResourceForm } from "./resource-form";
import { RESOURCES } from "./resources";
import { callAction } from "@/utils/call-action";
import { Photo } from "@/components/ui/photo";
import { BatchEditor } from "./media-batch-editor";
import { batchDeleteMedia, batchUpdateMedia, undoMediaBatch } from "./media-batch-actions";
import { LIBRARY_LIMIT, type BatchPatch } from "./media-batch";

// "Usata in…" labels that point to content (a deleted photo leaves that content without its picture)
const CONTENT_USE = /^(Ricordo|Dedica|Busta|Countdown|Sorpresa|Capsula|Aiutami|La voce|Respiro|Avatar)/;

type BatchResult = { text: string; details?: string[]; undoId?: string | null; tone: "ok" | "warn" };

const photoOf = (m: LibraryItem) => ({
  url: m.url,
  thumbUrl: m.thumbUrl,
  width: typeof m.width === "number" ? m.width : null,
  height: typeof m.height === "number" ? m.height : null,
  focus: typeof m.focus === "string" ? m.focus : null,
});
const n = (count: number) => (count === 1 ? "1 foto" : `${count} foto`);

export type LibraryItem = Record<string, unknown> & { id: string; kind: string; url: string; thumbUrl: string; size_bytes: number };

export function MediaLibrary({ items, categories, usage = {}, violaName = "Viola" }: { items: LibraryItem[]; categories: string[]; usage?: Record<string, string[]>; violaName?: string }) {
  const [tab, setTabState] = useState<"image" | "audio">("image");
  const [cat, setCat] = useState<string | null>(null);
  const [only, setOnly] = useState<"unused" | "private" | null>(null);
  const usedIn = (m: LibraryItem) => usage[m.id] ?? [];
  const [edit, setEdit] = useState<LibraryItem | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [meta, setMeta] = useState({ category: "noi", contexts: ["gallery", "breathing", "home", "surprises", "memories", "dedications"], include_in_random: true, visibility: "shared" as "shared" | "private" });
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const def = RESOURCES.media;

  // --- batch selection -------------------------------------------------------
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const selectionMode = tab === "image" && (selecting || selected.size > 0);
  const clearSelection = () => {
    setSelected(new Set());
    setSelecting(false);
  };
  const setTab = (t: "image" | "audio") => {
    clearSelection();
    setTabState(t);
  };
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const list = useMemo(
    () =>
      items.filter(
        (m) =>
          m.kind === tab &&
          (!cat || m.category === cat) &&
          (only === null || (only === "unused" ? !(usage[m.id] ?? []).length : m.visibility === "private")),
      ),
    [items, tab, cat, only, usage],
  );
  const unusedCount = items.filter((m) => m.kind === tab && !(usage[m.id] ?? []).length).length;
  const privateCount = items.filter((m) => m.kind === tab && m.visibility === "private").length;
  const suggestions = Array.from(new Set([...MEDIA_CATEGORY_SUGGESTIONS, ...categories]));
  const places = Array.from(new Set(items.map((m) => (typeof m.place === "string" ? m.place : "")).filter(Boolean)));
  const visibleSelected = list.filter((m) => selected.has(m.id)).length;
  const hiddenSelected = selected.size - visibleSelected;
  const allVisibleSelected = list.length > 0 && visibleSelected === list.length;
  const filtered = cat !== null || only !== null;
  const titleOf = (id: string) => {
    const m = items.find((x) => x.id === id);
    return (typeof m?.title === "string" && m.title) || "senza titolo";
  };
  const selectedItems = items.filter((m) => selected.has(m.id));
  const usedInContent = selectedItems.filter((m) => usedIn(m).some((u) => CONTENT_USE.test(u))).length;

  const applyBatch = (patch: BatchPatch) =>
    start(async () => {
      const ids = [...selected];
      const res = await callAction(() => batchUpdateMedia(ids, patch));
      if (!res.ok) return toast.show(res.error, "error");
      const failed = res.failed.map(titleOf);
      setResult({
        tone: failed.length ? "warn" : "ok",
        text: failed.length ? `${n(res.updated)} aggiornate · ${n(failed.length)} non aggiornate` : `✓ ${res.updated === 1 ? "1 foto aggiornata" : `${res.updated} foto aggiornate`}`,
        details: failed.length ? [`Non aggiornate (forse eliminate nel frattempo): ${failed.slice(0, 8).join(", ")}${failed.length > 8 ? "…" : ""}`] : undefined,
        undoId: res.undoId,
      });
      toast.show(res.updated === 1 ? "1 foto aggiornata ♡" : `${res.updated} foto aggiornate ♡`);
      setBatchOpen(false);
      clearSelection();
      router.refresh();
    });

  const undo = (undoId: string) =>
    start(async () => {
      const res = await callAction(() => undoMediaBatch(undoId));
      if (!res.ok) return toast.show(res.error, "error");
      setResult({
        tone: res.skipped ? "warn" : "ok",
        text: `Modifica annullata: ${res.restored === 1 ? "1 foto tornata" : `${res.restored} foto tornate`} com'era`,
        details: res.skipped ? [`${n(res.skipped)} erano state cambiate di nuovo dopo: le ho lasciate così.`] : undefined,
      });
      router.refresh();
    });

  const deleteSelected = () =>
    start(async () => {
      const ids = [...selected];
      const res = await callAction(() => batchDeleteMedia(ids));
      if (!res.ok) return toast.show(res.error, "error");
      const failed = res.failed.map(titleOf);
      setResult({
        tone: failed.length || res.filesLeft ? "warn" : "ok",
        text: `${res.deleted === 1 ? "1 foto eliminata" : `${res.deleted} foto eliminate`}${failed.length ? ` · ${n(failed.length)} non eliminate` : ""}`,
        details: [
          ...(failed.length ? [`Non eliminate: ${failed.slice(0, 8).join(", ")}`] : []),
          ...(res.filesLeft ? [`${res.filesLeft} file sono rimasti nello spazio foto: puoi ignorarli.`] : []),
        ],
      });
      setDeleteOpen(false);
      clearSelection();
      router.refresh();
    });

  const save = () =>
    start(async () => {
      if (!edit) return;
      const payload: Record<string, unknown> = {};
      for (const k of Object.keys(def.schema.shape)) if (k in edit) payload[k] = edit[k];
      const res = await callAction(() => updateResourceAction("media", edit.id, payload));
      if (res.ok) {
        toast.show("Salvato ♡");
        setEdit(null);
        router.refresh();
      } else toast.show(res.error, "error");
    });

  const remove = () =>
    start(async () => {
      if (!edit) return;
      const res = await callAction(() => deleteResourceAction("media", edit.id));
      if (res.ok) {
        toast.show("Eliminato");
        setConfirmDel(false);
        setEdit(null);
        router.refresh();
      } else toast.show(res.error, "error");
    });

  return (
    <div className="space-y-5">
      <Segmented
        label="Tipo"
        value={tab}
        onChange={setTab}
        options={[
          { value: "image", label: `Foto (${items.filter((i) => i.kind === "image").length})` },
          { value: "audio", label: `Audio (${items.filter((i) => i.kind === "audio").length})` },
        ]}
      />

      {tab === "image" ? (
        <section className="paper space-y-4 rounded-4xl p-5">
          <h2 className="font-display text-lg font-semibold text-vio-900">Carica nuove foto</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              {(id) => (
                <>
                  <Input id={id} list="media-cats" value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })} />
                  <datalist id="media-cats">
                    {suggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
            <div className="space-y-1">
              <Switch label="Nelle foto casuali (&quot;Fammi vedere noi&quot;, giochi)" checked={meta.include_in_random} onChange={(v) => setMeta({ ...meta, include_in_random: v })} />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-bold text-vio-800">Dove possono comparire</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MEDIA_CONTEXTS).map(([k, l]) => (
                <Chip key={k} active={meta.contexts.includes(k)} onClick={() => setMeta({ ...meta, contexts: meta.contexts.includes(k) ? meta.contexts.filter((x) => x !== k) : [...meta.contexts, k] })}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <Switch label="Privata (Viola non la vede finché non la condividi)" checked={meta.visibility === "private"} onChange={(v) => setMeta({ ...meta, visibility: v ? "private" : "shared" })} />
          <ImageUploader meta={meta} onUploaded={() => router.refresh()} />
        </section>
      ) : (
        <section className="paper space-y-3 rounded-4xl p-5">
          <h2 className="font-display text-lg font-semibold text-vio-900">Aggiungi un audio</h2>
          <p className="text-sm text-ink-soft">
            Poi usalo in{" "}
            <Link href="/admin/audio" className="font-bold text-vio-700 underline underline-offset-2">
              La voce di Adam
            </Link>
            , in una dedica, in una busta o in un preset di respiro.
          </p>
          <AudioCapture
            heading="Registra o scegli un audio"
            onSaved={() => {
              toast.show("Audio salvato ♡");
              router.refresh();
            }}
          />
        </section>
      )}

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtri">
        <Chip active={cat === null && only === null} onClick={() => (setCat(null), setOnly(null))}>
          Tutte
        </Chip>
        {unusedCount > 0 && (
          <Chip active={only === "unused"} onClick={() => setOnly(only === "unused" ? null : "unused")}>
            Non usate ({unusedCount})
          </Chip>
        )}
        {privateCount > 0 && (
          <Chip active={only === "private"} onClick={() => setOnly(only === "private" ? null : "private")}>
            Private ({privateCount})
          </Chip>
        )}
        {tab === "image" &&
          categories.length > 1 &&
          categories.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>
              {c}
            </Chip>
          ))}
      </div>

      {result && (
        <div role="status" className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl p-4 ring-1", result.tone === "ok" ? "bg-surface ring-line" : "bg-peach-100 ring-peach-200")}>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-vio-900">{result.text}</p>
            {result.details?.map((d) => (
              <p key={d} className="text-sm text-ink-soft">
                {d}
              </p>
            ))}
          </div>
          {result.undoId && (
            <Button size="sm" variant="soft" loading={pending} onClick={() => undo(result.undoId!)}>
              Annulla
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => setResult(null)} aria-label="Chiudi il messaggio">
            <X className="size-4" />
          </Button>
        </div>
      )}

      {tab === "image" && list.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-bold text-ink-muted">
            {list.length === 1 ? "1 foto" : `${list.length} foto`}
            {filtered ? " con questo filtro" : ""}
          </p>
          {selectionMode ? (
            <>
              <Button size="sm" variant="soft" onClick={() => (allVisibleSelected ? setSelected((s) => new Set([...s].filter((id) => !list.some((m) => m.id === id)))) : setSelected((s) => new Set([...s, ...list.map((m) => m.id)])))}>
                <CheckSquare className="size-4" />
                {allVisibleSelected ? "Deseleziona tutte" : `Seleziona tutte le ${list.length} mostrate`}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="soft" onClick={() => setSelecting(true)}>
              <CheckSquare className="size-4" /> Seleziona più foto
            </Button>
          )}
        </div>
      )}
      {selectionMode && items.length >= LIBRARY_LIMIT && (
        <p className="text-xs text-ink-muted">Qui vedi le ultime {LIBRARY_LIMIT} foto caricate: &quot;Seleziona tutte&quot; vale solo per queste.</p>
      )}

      {list.length === 0 ? (
        only === "unused" ? (
          <EmptyState title="Tutto è usato da qualche parte ♡" text="Nessun file dimenticato." />
        ) : (
          <EmptyState title={tab === "image" ? "Nessuna foto ancora" : "Nessun audio ancora"} text="Caricane qui sopra ♡" />
        )
      ) : tab === "image" ? (
        <ul className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4 lg:grid-cols-6" aria-label="Foto">
          {list.map((m) => {
            const on = selected.has(m.id);
            const title = (typeof m.title === "string" && m.title) || "foto senza titolo";
            const meta = [m.category, m.taken_on ? formatDate(String(m.taken_on), { month: "short", year: "numeric" }) : null, m.place].filter(Boolean).join(" · ");
            return (
              <li key={m.id} className="group relative" data-selected={on || undefined}>
                <button
                  type="button"
                  onClick={() => (selectionMode ? toggle(m.id) : setEdit({ ...m }))}
                  aria-pressed={selectionMode ? on : undefined}
                  aria-label={selectionMode ? `${title}: ${on ? "selezionata" : "non selezionata"}` : `Modifica ${title}`}
                  className={cn("press relative block w-full overflow-hidden rounded-2xl bg-surface shadow-soft transition", on && "ring-4 ring-wine-600 ring-offset-2 ring-offset-canvas dark:ring-rouge-400")}
                >
                  <Photo photo={photoOf(m)} alt="" frame={1} mode="cover" useThumb className="w-full" />
                  {on && <span className="absolute inset-0 bg-wine-900/30" aria-hidden />}
                  <span className="absolute top-1.5 left-1.5 flex flex-wrap gap-1" aria-hidden>
                    {m.visibility === "private" && <Lock className="size-5 rounded-full bg-black/60 p-1 text-white" />}
                    {Boolean(m.breathing_enabled) && <Wind className="size-5 rounded-full bg-black/60 p-1 text-white" />}
                    {usedIn(m).length === 0 && <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">non usata</span>}
                  </span>
                  {typeof m.title === "string" && m.title && <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 px-2 pt-4 pb-1 text-left text-[11px] font-bold text-white">{m.title}</span>}
                </button>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`Seleziona ${title}`}
                  onClick={() => toggle(m.id)}
                  className={cn(
                    "absolute top-0 right-0 grid size-11 place-items-center rounded-2xl transition-opacity",
                    selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:pointer-events-none",
                  )}
                  tabIndex={selectionMode ? 0 : -1}
                >
                  <span className={cn("grid size-7 place-items-center rounded-full border-2 border-white shadow-soft", on ? "bg-wine-600" : "bg-black/35")}>{on && <Check className="size-4 text-white" strokeWidth={3} />}</span>
                </button>
                {meta && (
                  <p className="mt-1 truncate px-0.5 text-[11px] font-bold text-ink-muted" title={meta}>
                    {meta}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-2">
          {list.map((m) => (
            <li key={m.id} className="paper flex items-center gap-3 rounded-3xl p-3">
              <Music className="size-5 shrink-0 text-vio-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-vio-900">{String(m.title ?? "Audio")}</p>
                <p className="truncate text-xs text-ink-muted">{usedIn(m).length ? `Usato in: ${usedIn(m).join(", ")}` : "Non ancora usato"}</p>
                <audio src={m.url} controls preload="none" className="mt-1 h-9 w-full" />
              </div>
              <Button size="sm" variant="soft" onClick={() => setEdit({ ...m })}>
                Modifica
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selectionMode && (
        <div className="sticky bottom-24 z-30 lg:bottom-6">
          <div role="toolbar" aria-label="Azioni sulle foto selezionate" className="mx-auto flex max-w-xl items-center gap-2 rounded-3xl bg-night-800 p-2 pl-4 text-moon shadow-float ring-1 ring-white/10">
            <p className="min-w-0 flex-1 text-sm leading-tight font-bold" aria-live="polite">
              {selected.size ? (selected.size === 1 ? "1 foto selezionata" : `${selected.size} foto selezionate`) : "Tocca le foto da selezionare"}
              {hiddenSelected > 0 && <span className="block text-[11px] font-normal text-white/60">{hiddenSelected} non visibili con questo filtro</span>}
            </p>
            <Button size="sm" variant="white" disabled={!selected.size} onClick={() => setBatchOpen(true)}>
              <Pencil className="size-4" /> Modifica
            </Button>
            <Button size="icon" variant="danger" disabled={!selected.size} onClick={() => setDeleteOpen(true)} aria-label="Elimina le foto selezionate">
              <Trash2 className="size-4" />
            </Button>
            <Button size="icon" variant="night" onClick={clearSelection} aria-label="Esci dalla selezione">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Sheet open={batchOpen} onClose={() => setBatchOpen(false)} title={`Modifica ${n(selected.size)}`} wide>
        {batchOpen && <BatchEditor count={selected.size} categories={suggestions} places={places} pending={pending} onCancel={() => setBatchOpen(false)} onConfirm={applyBatch} />}
      </Sheet>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title={`Eliminare ${n(selected.size)}?`}>
        <div role="alertdialog" aria-label={`Eliminare ${n(selected.size)}?`}>
          <p className="text-ink-soft">Le foto e i loro file verranno cancellati per sempre. Questa operazione non si può annullare.</p>
          {usedInContent > 0 && (
            <p className="mt-3 rounded-2xl bg-peach-100 px-3 py-2 text-sm font-bold text-vio-800">
              {usedInContent === 1 ? "1 di queste foto è usata" : `${usedInContent} di queste foto sono usate`} in ricordi, dediche o altri contenuti: lì resterà il testo, senza foto.
            </p>
          )}
          <p className="mt-3 text-sm text-ink-muted">
            {selectedItems
              .slice(0, 6)
              .map((m) => (typeof m.title === "string" && m.title) || "senza titolo")
              .join(", ")}
            {selectedItems.length > 6 ? ` e altre ${selectedItems.length - 6}` : ""}
          </p>
          <div className="mt-5 flex gap-3">
            <Button variant="soft" className="flex-1" onClick={() => setDeleteOpen(false)} data-autofocus>
              Annulla
            </Button>
            <Button variant="danger" className="flex-1" loading={pending} onClick={deleteSelected}>
              Elimina {n(selected.size)}
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.kind === "audio" ? "Audio" : "Foto"} wide>
        {edit && (
          <div className="space-y-4">
            {edit.kind === "image" ? (
              <Photo photo={photoOf(edit)} alt="" frame="natural" minRatio={1} maxRatio={16 / 9} className="w-full rounded-3xl" />
            ) : (
              <audio src={edit.url} controls className="w-full" />
            )}
            <div className="rounded-2xl bg-tint-50 p-3">
              <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">Dove la vede {violaName}</p>
              {edit.visibility === "private" ? (
                <p className="mt-1 text-sm font-bold text-vio-800">Da nessuna parte: è privata (la vedi solo tu).</p>
              ) : usedIn(edit).length ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {usedIn(edit).map((u) => (
                    <span key={u} className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-vio-800 ring-1 ring-line">
                      {u}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-ink-soft">Ancora da nessuna parte. Scegli sotto dove può comparire, o usala in una dedica o in un ricordo.</p>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              {Math.round(edit.size_bytes / 1024)} KB{edit.width ? ` · ${String(edit.width)}×${String(edit.height)}` : ""} · caricata il {formatDate(String(edit.created_at))}
            </p>
            <ResourceForm
              fields={
                edit.kind === "audio"
                  ? def.fields.filter((f) => ["title", "caption", "category", "visibility"].includes(f.name))
                  : def.fields
                      // place/focus exist only after supabase/update.sql: never send a column the database lacks
                      .filter((f) => (f.name !== "place" && f.name !== "focus") || f.name in edit)
                      .map((f) => (f.name === "category" ? { ...f, suggestions } : f))
              }
              values={edit}
              onChange={(p) => setEdit((e) => (e ? { ...e, ...p } : e))}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setConfirmDel(true)} aria-label="Elimina">
                <Trash2 className="size-4" /> Elimina
              </Button>
              <Button className={cn("flex-1")} loading={pending} onClick={save}>
                Salva
              </Button>
            </div>
          </div>
        )}
      </Sheet>
      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)} title="Eliminare il file?">
        <p className="text-ink-soft">Il file verrà cancellato per sempre e tolto da dediche, ricordi e buste che lo usano.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="soft" className="flex-1" onClick={() => setConfirmDel(false)}>
            Annulla
          </Button>
          <Button variant="danger" className="flex-1" loading={pending} onClick={remove}>
            Elimina
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
