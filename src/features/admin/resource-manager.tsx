"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, Input } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { formatDate, formatDateTime } from "@/utils/dates";
import { cn } from "@/utils/cn";
import { createResourceAction, deleteResourceAction, reorderResourceAction, updateResourceAction } from "./actions";
import { ResourceForm } from "./resource-form";
import { defaultsFor, getResource, type Option } from "./resources";
import { callAction } from "@/utils/call-action";

type Row = Record<string, unknown> & { id: string };

const plain = (s: unknown) =>
  String(s ?? "")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function describe(v: unknown) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateTime(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return formatDate(v);
  return plain(v).slice(0, 140);
}

export function ResourceManager({
  resourceKey,
  rows,
  thumbs = {},
  extraOptions,
  lockedDefaults,
}: {
  resourceKey: string;
  rows: Row[];
  thumbs?: Record<string, string>;
  extraOptions?: Record<string, Option[]>;
  /** values forced on new records (e.g. phrases filtered by kind) */
  lockedDefaults?: Record<string, unknown>;
}) {
  const def = getResource(resourceKey)!;
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [badge, setBadge] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; values: Record<string, unknown> } | null>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const badgeLabel = (v: unknown) => def.badgeOptions?.find((o) => o.value === v)?.label ?? String(v ?? "");
  const badges = def.badgeField ? Array.from(new Set(rows.map((r) => String(r[def.badgeField!] ?? "")))).filter(Boolean) : [];
  const list = rows.filter((r) => {
    if (badge && String(r[def.badgeField!]) !== badge) return false;
    if (!q) return true;
    const hay = `${plain(r[def.titleField])} ${plain(r[def.subtitleField ?? ""])}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const openNew = () => {
    setErrors({});
    setEditing({ id: null, values: { ...defaultsFor(def), ...(lockedDefaults ?? {}) } });
  };
  const openEdit = (r: Row) => {
    setErrors({});
    setEditing({ id: r.id, values: { ...r } });
  };

  const formFields = def.fields;
  const payloadOf = (values: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(def.schema.shape)) if (k in values) out[k] = values[k];
    return out;
  };

  const save = () =>
    start(async () => {
      if (!editing) return;
      const data = payloadOf(editing.values);
      const id = editing.id;
      const res = await callAction(() => (id ? updateResourceAction(def.key, id, data) : createResourceAction(def.key, data)));
      if (res.ok) {
        toast.show(editing.id ? "Salvato ♡" : "Creato ♡");
        setEditing(null);
        router.refresh();
      } else {
        const field = res.error.split(":")[0];
        if (field && def.fields.some((f) => f.name === field)) setErrors({ [field]: res.error.split(":").slice(1).join(":").trim() });
        toast.show(res.error, "error");
      }
    });

  const toggle = (r: Row) =>
    start(async () => {
      const field = def.toggleField;
      if (!field) return;
      const cur = r[field];
      const next = field === "visibility" ? (cur === "shared" ? "private" : "shared") : !cur;
      const res = await callAction(() => updateResourceAction(def.key, r.id, { [field]: next }));
      if (res.ok) router.refresh();
      else toast.show(res.error, "error");
    });

  const move = (i: number, d: -1 | 1) =>
    start(async () => {
      const ids = rows.map((r) => r.id);
      const j = i + d;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      const res = await callAction(() => reorderResourceAction(def.key, ids));
      if (res.ok) router.refresh();
      else toast.show(res.error, "error");
    });

  const remove = () =>
    start(async () => {
      if (!confirm) return;
      const res = await callAction(() => deleteResourceAction(def.key, confirm.id));
      if (res.ok) {
        toast.show("Eliminato");
        setConfirm(null);
        router.refresh();
      } else toast.show(res.error, "error");
    });

  const isOn = (r: Row) => (def.toggleField === "visibility" ? r.visibility === "shared" : Boolean(r[def.toggleField ?? ""]));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {!def.noCreate && (
          <Button onClick={openNew}>
            <Plus className="size-4" /> Nuovo
          </Button>
        )}
        <div className="relative min-w-40 flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca…" className="h-11 pl-10" aria-label="Cerca" />
        </div>
      </div>
      {badges.length > 1 && (
        <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip active={badge === null} onClick={() => setBadge(null)}>
            Tutti ({rows.length})
          </Chip>
          {badges.map((b) => (
            <Chip key={b} active={badge === b} onClick={() => setBadge(b)}>
              {badgeLabel(b)}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {list.length === 0 && <EmptyState title="Ancora niente qui" text={def.noCreate ? "Carica un file per iniziare." : "Tocca \"Nuovo\" per aggiungere il primo."} />}
        <AnimatePresence initial={false}>
          {list.map((r) => {
            const idx = rows.findIndex((x) => x.id === r.id);
            const thumb = thumbs[(r.media_id as string) ?? ""] ?? thumbs[r.id];
            return (
              <motion.article key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("paper flex gap-3 rounded-3xl p-3.5", def.toggleField && !isOn(r) && "opacity-60")}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="size-16 shrink-0 rounded-2xl object-cover" loading="lazy" />
                ) : typeof r.icon === "string" && r.icon ? (
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blush-100 text-wine-600">
                    <Icon name={r.icon} className="size-6 text-xl" />
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {def.badgeField && r[def.badgeField] ? <span className="rounded-full bg-lilac-100 px-2 py-0.5 text-[11px] font-extrabold text-lilac-600">{badgeLabel(r[def.badgeField])}</span> : null}
                    {r.pinned || r.is_default || r.featured ? <span className="rounded-full bg-peach-100 px-2 py-0.5 text-[11px] font-extrabold text-wine-700">in evidenza</span> : null}
                  </div>
                  <h3 className="mt-0.5 truncate font-extrabold text-wine-900">{plain(r[def.titleField]) || "(senza titolo)"}</h3>
                  {def.subtitleField && r[def.subtitleField] ? <p className="line-clamp-2 text-sm text-ink-soft">{describe(r[def.subtitleField])}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="soft" onClick={() => openEdit(r)}>
                      <Pencil className="size-3.5" /> Modifica
                    </Button>
                    {!def.noCreate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setErrors({});
                          const copy: Record<string, unknown> = { ...r };
                          delete copy.id;
                          if (typeof copy[def.titleField] === "string") copy[def.titleField] = `${copy[def.titleField]} (copia)`;
                          setEditing({ id: null, values: copy });
                        }}
                        aria-label="Duplica"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(r)} aria-label="Elimina">
                      <Trash2 className="size-3.5" />
                    </Button>
                    {def.sortable && !q && !badge && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0 || pending} aria-label="Sposta su">
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === rows.length - 1 || pending} aria-label="Sposta giù">
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {def.toggleField && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOn(r)}
                    aria-label={def.toggleLabel ?? "Attivo"}
                    title={def.toggleLabel}
                    onClick={() => toggle(r)}
                    className="-mt-1 -mr-1 grid h-11 w-14 shrink-0 place-items-center"
                  >
                    <span className={cn("relative h-7 w-12 rounded-full transition-colors", isOn(r) ? "bg-wine-600" : "bg-wine-100")}>
                      <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", isOn(r) ? "left-6" : "left-1")} />
                    </span>
                  </button>
                )}
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? `Modifica ${def.singular.toLowerCase()}` : `Nuovo: ${def.singular.toLowerCase()}`} wide>
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <ResourceForm fields={formFields} values={editing.values} onChange={(p) => setEditing((ed) => (ed ? { ...ed, values: { ...ed.values, ...p } } : ed))} extraOptions={extraOptions} errors={errors} />
            <div className="sticky -bottom-8 mt-6 flex gap-3 bg-cream-50 pt-3 pb-2">
              <Button variant="soft" className="flex-1" onClick={() => setEditing(null)}>
                Annulla
              </Button>
              <Button type="submit" className="flex-1" loading={pending}>
                Salva
              </Button>
            </div>
          </form>
        )}
      </Sheet>

      <Sheet open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Eliminare?">
        <p className="text-ink-soft">
          &quot;{plain(confirm?.[def.titleField]) || def.singular}&quot; verrà eliminato per sempre.
          {def.table === "media" && " Anche il file verrà cancellato dallo storage."}
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="soft" className="flex-1" onClick={() => setConfirm(null)}>
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
