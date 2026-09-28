"use client";

import { useId, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { MEDIA_CONTEXTS, PHOTO_FOCUS } from "@/features/content/constants";
import { cn } from "@/utils/cn";
import { TagsInput } from "./fields/pickers";
import { describePatch, type BatchPatch } from "./media-batch";

type TextKey = "category" | "taken_on" | "place" | "caption";
type Mode = "keep" | "set" | "clear";

const KEEP = "Non modificare";

/** One row: "Non modificare" by default; changed rows are highlighted. */
function Row({ label, changed, children, htmlFor }: { label: string; changed: boolean; children: React.ReactNode; htmlFor: string }) {
  return (
    <div className={cn("rounded-2xl p-3 transition-colors", changed ? "bg-blush-100 ring-2 ring-wine-400" : "bg-surface ring-1 ring-line")}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between gap-2 text-sm font-bold text-vio-900">
        {label}
        {changed && <span className="rounded-full bg-wine-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase">cambia</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * Batch editor for the selected photos. Every field starts as "Non
 * modificare"; only the fields Adam changes end up in the patch.
 */
export function BatchEditor({
  count,
  categories,
  places,
  onCancel,
  onConfirm,
  pending,
}: {
  count: number;
  categories: string[];
  places: string[];
  onCancel: () => void;
  onConfirm: (patch: BatchPatch) => void;
  pending: boolean;
}) {
  const uid = useId();
  const [text, setText] = useState<Record<TextKey, { mode: Mode; value: string }>>({
    category: { mode: "keep", value: "" },
    taken_on: { mode: "keep", value: "" },
    place: { mode: "keep", value: "" },
    caption: { mode: "keep", value: "" },
  });
  const [choice, setChoice] = useState<{ visibility: string; focus: string; featured: string; include_in_random: string }>({
    visibility: "",
    focus: "",
    featured: "",
    include_in_random: "",
  });
  const [tagsAdd, setTagsAdd] = useState<string[]>([]);
  const [tagsRemove, setTagsRemove] = useState<string[]>([]);
  const [contexts, setContexts] = useState<Record<string, "" | "add" | "remove">>({});
  const [confirming, setConfirming] = useState(false);

  const patch: BatchPatch = {};
  for (const k of Object.keys(text) as TextKey[]) {
    const f = text[k];
    if (f.mode === "clear") patch[k] = null;
    else if (f.mode === "set" && f.value.trim()) patch[k] = f.value.trim();
  }
  if (choice.visibility) patch.visibility = choice.visibility as "shared" | "private";
  if (choice.focus) patch.focus = choice.focus;
  if (choice.featured) patch.featured = choice.featured === "yes";
  if (choice.include_in_random) patch.include_in_random = choice.include_in_random === "yes";
  if (tagsAdd.length) patch.tags_add = tagsAdd;
  if (tagsRemove.length) patch.tags_remove = tagsRemove;
  const add = Object.keys(contexts).filter((c) => contexts[c] === "add");
  const remove = Object.keys(contexts).filter((c) => contexts[c] === "remove");
  if (add.length) patch.contexts_add = add;
  if (remove.length) patch.contexts_remove = remove;
  const changes = describePatch(patch);
  const photos = count === 1 ? "1 foto" : `${count} foto`;

  if (confirming) {
    return (
      <div role="alertdialog" aria-labelledby={`${uid}-q`} aria-describedby={`${uid}-d`}>
        <p id={`${uid}-q`} className="font-display text-2xl font-semibold text-vio-900">
          Modifica {photos}?
        </p>
        <p id={`${uid}-d`} className="mt-1 text-sm text-ink-soft">
          Stai per impostare, in tutte le {photos} selezionate:
        </p>
        <dl className="mt-3 space-y-2">
          {changes.map((c) => (
            <div key={c.label} className="rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-line">
              <dt className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">{c.label}</dt>
              <dd className="font-bold text-vio-900">{c.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-muted">Tutto il resto (titoli, altre informazioni) resta com&apos;è. Subito dopo potrai annullare.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="soft" className="flex-1" onClick={() => setConfirming(false)} disabled={pending}>
            <ArrowLeft className="size-4" /> Indietro
          </Button>
          <Button className="flex-1" loading={pending} onClick={() => onConfirm(patch)} data-autofocus>
            Conferma modifica
          </Button>
        </div>
      </div>
    );
  }

  const textRow = (key: TextKey, label: string, input: (id: string) => React.ReactNode) => {
    const id = `${uid}-${key}`;
    const f = text[key];
    return (
      <Row label={label} changed={f.mode === "clear" || (f.mode === "set" && Boolean(f.value.trim()))} htmlFor={`${id}-mode`}>
        <Select id={`${id}-mode`} value={f.mode} onChange={(e) => setText((t) => ({ ...t, [key]: { ...t[key], mode: e.target.value as Mode } }))}>
          <option value="keep">{KEEP}</option>
          <option value="set">Imposta…</option>
          <option value="clear">Svuota (togli a tutte)</option>
        </Select>
        {f.mode === "set" && <div className="mt-2">{input(id)}</div>}
      </Row>
    );
  };
  const choiceRow = (key: keyof typeof choice, label: string, options: [string, string][]) => {
    const id = `${uid}-${key}`;
    return (
      <Row label={label} changed={Boolean(choice[key])} htmlFor={id}>
        <Select id={id} value={choice[key]} onChange={(e) => setChoice((c) => ({ ...c, [key]: e.target.value }))}>
          <option value="">{KEEP}</option>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Row>
    );
  };
  const setVal = (key: TextKey) => (v: string) => setText((t) => ({ ...t, [key]: { ...t[key], value: v } }));

  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">
        Cambia solo quello che ti serve: i campi su <b>&quot;{KEEP}&quot;</b> restano come sono in ogni foto.
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {textRow("category", "Categoria", (id) => (
          <>
            <Input id={id} list={`${id}-list`} value={text.category.value} onChange={(e) => setVal("category")(e.target.value)} placeholder="Es. noi" maxLength={60} aria-label="Nuova categoria" />
            <datalist id={`${id}-list`}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        ))}
        {textRow("taken_on", "Data", (id) => (
          <Input id={id} type="date" value={text.taken_on.value} onChange={(e) => setVal("taken_on")(e.target.value)} aria-label="Nuova data" />
        ))}
        {textRow("place", "Luogo", (id) => (
          <>
            <Input id={id} list={`${id}-list`} value={text.place.value} onChange={(e) => setVal("place")(e.target.value)} placeholder="Es. Torino" maxLength={120} aria-label="Nuovo luogo" />
            <datalist id={`${id}-list`}>
              {places.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        ))}
        {textRow("caption", "Didascalia", (id) => (
          <Input id={id} value={text.caption.value} onChange={(e) => setVal("caption")(e.target.value)} maxLength={1000} aria-label="Nuova didascalia" />
        ))}
        {choiceRow("visibility", "Visibilità", [
          ["shared", "Condivisa con Viola"],
          ["private", "Privata (solo tu)"],
        ])}
        {choiceRow("include_in_random", "Nelle foto casuali e nei giochi", [
          ["yes", "Sì"],
          ["no", "No"],
        ])}
        {choiceRow("featured", "In evidenza", [
          ["yes", "Sì"],
          ["no", "No"],
        ])}
        {choiceRow("focus", "Posizione del soggetto", Object.entries(PHOTO_FOCUS))}
      </div>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        <Row label="Aggiungi tag" changed={tagsAdd.length > 0} htmlFor={`${uid}-tags-add`}>
          <div id={`${uid}-tags-add`}>
            <TagsInput value={tagsAdd} onChange={setTagsAdd} />
          </div>
        </Row>
        <Row label="Togli tag" changed={tagsRemove.length > 0} htmlFor={`${uid}-tags-rm`}>
          <div id={`${uid}-tags-rm`}>
            <TagsInput value={tagsRemove} onChange={setTagsRemove} />
          </div>
        </Row>
      </div>

      <fieldset className={cn("mt-2.5 rounded-2xl p-3", add.length || remove.length ? "bg-blush-100 ring-2 ring-wine-400" : "bg-surface ring-1 ring-line")}>
        <legend className="px-1 text-sm font-bold text-vio-900">Dove compaiono</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(MEDIA_CONTEXTS).map(([k, l]) => (
            <label key={k} className="flex items-center justify-between gap-2 text-sm text-vio-800">
              <span className="min-w-0 truncate">{l}</span>
              <Select className="h-10 w-40 shrink-0 text-sm" value={contexts[k] ?? ""} onChange={(e) => setContexts((c) => ({ ...c, [k]: e.target.value as "" | "add" | "remove" }))} aria-label={`${l}: ${KEEP.toLowerCase()}, aggiungi o togli`}>
                <option value="">{KEEP}</option>
                <option value="add">Aggiungi</option>
                <option value="remove">Togli</option>
              </Select>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sticky -bottom-8 mt-5 flex items-center gap-3 bg-cream-50 pt-3 pb-2">
        <Button variant="soft" className="flex-1" onClick={onCancel}>
          Annulla
        </Button>
        <Button className="flex-1" disabled={!changes.length} onClick={() => setConfirming(true)}>
          {changes.length ? `Continua (${changes.length})` : "Scegli cosa cambiare"}
        </Button>
      </div>
    </div>
  );
}
