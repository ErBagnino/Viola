"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Lock, Music, Trash2, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input, Segmented, Switch } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { MEDIA_CATEGORY_SUGGESTIONS, MEDIA_CONTEXTS } from "@/features/content/constants";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/dates";
import { deleteResourceAction, updateResourceAction } from "./actions";
import { AudioUploader, ImageUploader } from "./fields/uploaders";
import { ResourceForm } from "./resource-form";
import { RESOURCES } from "./resources";
import { callAction } from "@/utils/call-action";

export type LibraryItem = Record<string, unknown> & { id: string; kind: string; url: string; thumbUrl: string; size_bytes: number };

export function MediaLibrary({ items, categories }: { items: LibraryItem[]; categories: string[] }) {
  const [tab, setTab] = useState<"image" | "audio">("image");
  const [cat, setCat] = useState<string | null>(null);
  const [edit, setEdit] = useState<LibraryItem | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [meta, setMeta] = useState({ category: "noi", contexts: ["gallery", "breathing", "home", "surprises", "memories", "dedications"], include_in_random: true, visibility: "shared" as "shared" | "private" });
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const def = RESOURCES.media;

  const list = useMemo(() => items.filter((m) => m.kind === tab && (!cat || m.category === cat)), [items, tab, cat]);
  const suggestions = Array.from(new Set([...MEDIA_CATEGORY_SUGGESTIONS, ...categories]));

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
          <h2 className="font-display text-lg font-semibold text-wine-900">Carica nuove foto</h2>
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
            <p className="mb-1.5 text-sm font-bold text-wine-800">Dove possono comparire</p>
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
          <h2 className="font-display text-lg font-semibold text-wine-900">Carica un audio</h2>
          <p className="text-sm text-ink-soft">Poi aggiungilo in &quot;Audio&quot; (La voce di Adam), in una dedica, in una busta o in un preset di respiro.</p>
          <AudioUploader onUploaded={() => router.refresh()} />
        </section>
      )}

      {tab === "image" && categories.length > 1 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip active={cat === null} onClick={() => setCat(null)}>
            Tutte
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </Chip>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState title={tab === "image" ? "Nessuna foto ancora" : "Nessun audio ancora"} text="Caricane qui sopra ♡" />
      ) : tab === "image" ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {list.map((m) => (
            <button key={m.id} type="button" onClick={() => setEdit({ ...m })} className="press relative overflow-hidden rounded-2xl bg-white shadow-soft" aria-label={`Modifica ${String(m.title ?? "foto")}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.thumbUrl} alt={String(m.title ?? "")} loading="lazy" className="aspect-square w-full object-cover" />
              <span className="absolute top-1.5 left-1.5 flex gap-1">
                {m.visibility === "private" && <Lock className="size-5 rounded-full bg-black/60 p-1 text-white" />}
                {Boolean(m.breathing_enabled) && <Wind className="size-5 rounded-full bg-black/60 p-1 text-white" />}
              </span>
              {typeof m.title === "string" && m.title && <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 px-2 pt-4 pb-1 text-left text-[11px] font-bold text-white">{m.title}</span>}
            </button>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((m) => (
            <li key={m.id} className="paper flex items-center gap-3 rounded-3xl p-3">
              <Music className="size-5 shrink-0 text-wine-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-wine-900">{String(m.title ?? "Audio")}</p>
                <audio src={m.url} controls preload="none" className="mt-1 h-9 w-full" />
              </div>
              <Button size="sm" variant="soft" onClick={() => setEdit({ ...m })}>
                Modifica
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.kind === "audio" ? "Audio" : "Foto"} wide>
        {edit && (
          <div className="space-y-4">
            {edit.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={edit.url} alt="" className="max-h-72 w-full rounded-3xl object-contain" />
            ) : (
              <audio src={edit.url} controls className="w-full" />
            )}
            <p className="text-xs text-ink-muted">
              {Math.round(edit.size_bytes / 1024)} KB{edit.width ? ` · ${String(edit.width)}×${String(edit.height)}` : ""} · caricata il {formatDate(String(edit.created_at))}
            </p>
            <ResourceForm
              fields={edit.kind === "audio" ? def.fields.filter((f) => ["title", "caption", "category", "visibility"].includes(f.name)) : def.fields.map((f) => (f.name === "category" ? { ...f, suggestions } : f))}
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
