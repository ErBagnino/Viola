"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bold, Check, Eye, Heading2, ImageIcon, Italic, List, Music, Pencil, Quote, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { Icon, ICON_NAMES } from "@/components/ui/icon";
import { Markdown } from "@/components/ui/markdown";
import { toneClass } from "@/components/ui/card";
import { APP_ACTIONS, APP_ACTION_KEYS } from "@/features/actions/registry";
import { TONE_OPTIONS } from "@/features/content/constants";
import { cn } from "@/utils/cn";
import { listMediaForPicker, mediaPreview, type PickerMedia } from "../media-actions";
import { ImageUploader } from "./uploaders";
import { AudioCapture, type SavedAudio } from "./audio-capture";
import { formatDuration } from "@/utils/audio-formats";

// ---------------------------------------------------------------------------
// MediaPicker — choose (or upload) a photo / audio from the library
// ---------------------------------------------------------------------------
export function MediaPicker({
  value,
  onChange,
  kind = "image",
  inline = false,
}: {
  value: string | null;
  onChange: (id: string | null, info?: { title: string | null }) => void;
  kind?: "image" | "audio";
  /** audio: with no file yet, show "Registra / Scegli un file" right in the form */
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PickerMedia[] | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; url: string; thumbUrl: string; title: string | null } | null>(null);
  const [q, setQ] = useState("");
  // Only show the preview that matches the current value.
  const preview = value && loaded?.id === value ? loaded : null;

  const load = useCallback(async () => {
    const res = await listMediaForPicker(kind);
    if (res.ok) setItems(res.items);
  }, [kind]);

  const openPicker = () => {
    setOpen(true);
    if (!items) load();
  };

  useEffect(() => {
    if (!value) return;
    let alive = true;
    mediaPreview(value).then((r) => {
      if (alive && r.ok && r.item) setLoaded(r.item);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  const filtered = useMemo(() => (items ?? []).filter((m) => !q || `${m.title ?? ""} ${m.category ?? ""}`.toLowerCase().includes(q.toLowerCase())), [items, q]);
  const choose = (id: string, title: string | null) => {
    onChange(id, { title });
    setOpen(false);
  };
  const audioSaved = async (m: SavedAudio) => {
    choose(m.id, m.title);
    await load();
  };

  const library = (
    <Sheet open={open} onClose={() => setOpen(false)} title={kind === "image" ? "Scegli una foto" : "Scegli un audio"} wide>
      <div className="space-y-4">
        {kind === "image" ? (
          <ImageUploader
            compact
            onUploaded={async (ids) => {
              await load();
              onChange(ids[0]);
              setOpen(false);
            }}
          />
        ) : (
          !inline && <AudioCapture heading="Aggiungi un nuovo audio" onSaved={audioSaved} />
        )}
        {kind === "audio" && !inline && <p className="pt-1 text-sm font-extrabold text-vio-800">Oppure uno già caricato</p>}
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
          <Input value={q} aria-label="Cerca" onChange={(e) => setQ(e.target.value)} placeholder="Cerca per titolo o categoria" className="pl-10" />
        </div>
        {!items ? (
          <p className="py-6 text-center text-ink-muted">Carico…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-ink-muted">{kind === "image" ? "Nessun file. Caricane uno qui sopra ♡" : "Ancora nessun audio caricato."}</p>
        ) : kind === "image" ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => choose(m.id, m.title)}
                className={cn("relative overflow-hidden rounded-2xl ring-offset-2", value === m.id && "ring-4 ring-wine-500")}
                aria-label={m.title ?? "Foto"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.thumbUrl} alt={m.title ?? ""} loading="lazy" className="aspect-square w-full object-cover" />
                {value === m.id && <Check className="absolute top-1.5 right-1.5 size-5 rounded-full bg-wine-600 p-0.5 text-white" />}
              </button>
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((m) => (
              <li key={m.id} className={cn("space-y-2 rounded-2xl bg-surface p-3", value === m.id && "ring-2 ring-wine-500")}>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-bold text-vio-900">
                    {m.title || "Audio senza titolo"}
                    <span className="ml-2 text-xs font-semibold text-ink-muted">{formatDuration(m.duration)}</span>
                  </p>
                  <Button size="sm" onClick={() => choose(m.id, m.title)} aria-label={`Usa ${m.title || "questo audio"}`}>
                    Usa
                  </Button>
                </div>
                <audio src={m.url} controls preload="none" className="h-9 w-full" aria-label={`Ascolta ${m.title || "l'audio"}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );

  // Audio, nothing chosen yet, main field of the form: record or pick right here.
  if (kind === "audio" && inline && !value) {
    return (
      <div className="space-y-2">
        <AudioCapture onSaved={audioSaved} askTitle={false} />
        <Button size="sm" variant="ghost" onClick={openPicker}>
          <Music className="size-4" /> Oppure scegli un audio già caricato
        </Button>
        {library}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={openPicker} aria-label={preview ? "Cambia file" : "Scegli un file"} className="press grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-tint-200 bg-surface/70 text-vio-500">
          {preview ? (
            kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.thumbUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Music className="size-7" />
            )
          ) : kind === "image" ? (
            <ImageIcon className="size-7" />
          ) : (
            <Music className="size-7" />
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          {preview && kind === "audio" && <audio src={preview.url} controls className="h-9 w-full" preload="none" aria-label={`Ascolta ${preview.title || "l'audio"}`} />}
          {preview?.title && <p className="truncate text-sm font-bold text-vio-800">{preview.title}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="soft" onClick={openPicker}>
              {value ? "Cambia" : kind === "image" ? "Scegli foto" : "Aggiungi audio"}
            </Button>
            {value && (
              <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
                <X className="size-4" /> Rimuovi
              </Button>
            )}
          </div>
        </div>
      </div>
      {library}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IconPicker
// ---------------------------------------------------------------------------
const EMOJIS = ["♡", "💗", "💌", "🌸", "🌙", "⭐", "✨", "🫶", "🧸", "☕", "🍓", "🌈", "🎀", "🦋", "🌊", "🔥"];

export function IconPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => setOpen(true)} className="press grid size-12 place-items-center rounded-2xl border border-blush-200 bg-surface text-vio-600">
        {value ? <Icon name={value} className="size-6 text-2xl" /> : <Pencil className="size-5" />}
      </button>
      <Button size="sm" variant="soft" onClick={() => setOpen(true)}>
        {value ? "Cambia icona" : "Scegli icona"}
      </Button>
      {value && (
        <Button size="sm" variant="ghost" onClick={() => onChange(null)} aria-label="Rimuovi icona">
          <X className="size-4" />
        </Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Scegli un'icona" wide>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {[...ICON_NAMES.filter((n) => n !== "back"), ...EMOJIS].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={cn("press grid aspect-square place-items-center rounded-2xl bg-surface text-vio-700", value === n && "ring-2 ring-wine-500")}
              aria-label={n}
              title={n}
            >
              <Icon name={n} className="size-6 text-2xl" />
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColorPicker (romantic tones)
// ---------------------------------------------------------------------------
export function ColorPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colore">
      {Object.entries(TONE_OPTIONS).map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          title={label}
          className={cn("size-10 rounded-2xl bg-gradient-to-br shadow-soft ring-offset-2", toneClass(k), value === k && "ring-3 ring-wine-600")}
        >
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionPicker
// ---------------------------------------------------------------------------
export function ActionPicker({ value, onChange, id, allowUrl }: { value: string | null; onChange: (v: string) => void; id?: string; allowUrl?: boolean }) {
  const groups = useMemo(() => {
    const g = new Map<string, string[]>();
    for (const k of APP_ACTION_KEYS) {
      if (k === "url" && !allowUrl) continue;
      const grp = APP_ACTIONS[k].group;
      g.set(grp, [...(g.get(grp) ?? []), k]);
    }
    return [...g];
  }, [allowUrl]);
  return (
    <Select id={id} value={value ?? "none"} onChange={(e) => onChange(e.target.value)}>
      {groups.map(([g, keys]) => (
        <optgroup key={g} label={g}>
          {keys.map((k) => (
            <option key={k} value={k}>
              {APP_ACTIONS[k as keyof typeof APP_ACTIONS].label}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

// ---------------------------------------------------------------------------
// RichTextEditor (markdown + toolbar + preview)
// ---------------------------------------------------------------------------
export function RichTextEditor({ value, onChange, id, rows = 8 }: { value: string; onChange: (v: string) => void; id?: string; rows?: number }) {
  const [preview, setPreview] = useState(false);
  const [el, setEl] = useState<HTMLTextAreaElement | null>(null);
  const wrap = (before: string, after = before, placeholder = "testo") => {
    if (!el) return onChange(`${value}${before}${placeholder}${after}`);
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };
  const line = (prefix: string) => {
    const s = el?.selectionStart ?? value.length;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    onChange(value.slice(0, start) + prefix + value.slice(start));
  };
  const tools = [
    { icon: Bold, label: "Grassetto", run: () => wrap("**") },
    { icon: Italic, label: "Corsivo", run: () => wrap("_") },
    { icon: Heading2, label: "Titolo", run: () => line("## ") },
    { icon: List, label: "Elenco", run: () => line("- ") },
    { icon: Quote, label: "Citazione", run: () => line("> ") },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-blush-200 bg-surface/80">
      <div className="flex items-center gap-1 border-b border-blush-100 px-2 py-1.5">
        {tools.map((t) => (
          <button key={t.label} type="button" onClick={t.run} disabled={preview} className="grid size-9 place-items-center rounded-xl text-vio-700 hover:bg-tint-50 disabled:opacity-40" aria-label={t.label} title={t.label}>
            <t.icon className="size-4" />
          </button>
        ))}
        <button type="button" onClick={() => setPreview((p) => !p)} className={cn("ml-auto flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-bold", preview ? "bg-wine-700 text-white" : "text-vio-700 hover:bg-tint-50")}>
          <Eye className="size-4" /> Anteprima
        </button>
      </div>
      {preview ? (
        <div className="min-h-40 p-4">{value.trim() ? <Markdown>{value}</Markdown> : <p className="text-ink-muted">Niente da mostrare.</p>}</div>
      ) : (
        <Textarea id={id} ref={setEl} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="rounded-none border-0 bg-transparent shadow-none focus:ring-0" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ListInput (array of strings) + TagsInput
// ---------------------------------------------------------------------------
export function ListInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (t) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input value={v} aria-label={`Voce ${i + 1}`} onChange={(e) => onChange(value.map((x, k) => (k === i ? e.target.value : x)))} />
          <Button variant="ghost" size="icon" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={`Rimuovi voce ${i + 1}`}>
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={draft} aria-label="Nuova voce" placeholder={placeholder ?? "Aggiungi…"} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <Button variant="soft" onClick={add}>
          Aggiungi
        </Button>
      </div>
    </div>
  );
}

export function TagsInput({ value, onChange, suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[] }) {
  const [draft, setDraft] = useState("");
  const add = (t: string) => {
    const v = t.trim().toLowerCase();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-tint-100 px-3 py-1 text-sm font-bold text-vio-800">
            #{t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Rimuovi ${t}`}>
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <Input className="mt-2" value={draft} aria-label="Nuovo tag" placeholder="Scrivi un tag e premi Invio" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), add(draft))} />
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-vio-600">
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepsEditor (grounding) and OptionsEditor (quiz)
// ---------------------------------------------------------------------------
type Step = { title: string; text?: string; count?: number; emoji?: string };

export function StepsEditor({ value, onChange }: { value: Step[]; onChange: (v: Step[]) => void }) {
  const set = (i: number, patch: Partial<Step>) => onChange(value.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-3">
      {value.map((s, i) => (
        <div key={i} className="space-y-2 rounded-2xl bg-surface/70 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-vio-500 uppercase">Passo {i + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => onChange(value.filter((_, k) => k !== i))}>
              <X className="size-4" /> Rimuovi
            </Button>
          </div>
          <Input value={s.title} aria-label={`Passo ${i + 1}: titolo`} onChange={(e) => set(i, { title: e.target.value })} placeholder="Titolo (es. 5 cose che vedi)" />
          <Textarea rows={2} value={s.text ?? ""} aria-label={`Passo ${i + 1}: testo`} onChange={(e) => set(i, { text: e.target.value })} placeholder="Testo" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={0} max={10} aria-label={`Passo ${i + 1}: campi da compilare`} value={s.count ?? ""} onChange={(e) => set(i, { count: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Campi da compilare (0-10)" />
            <Input value={s.emoji ?? ""} aria-label={`Passo ${i + 1}: emoji`} maxLength={8} onChange={(e) => set(i, { emoji: e.target.value || undefined })} placeholder="Emoji" />
          </div>
        </div>
      ))}
      <Button variant="soft" onClick={() => onChange([...value, { title: "" }])}>
        + Aggiungi passo
      </Button>
    </div>
  );
}

export function OptionsEditor({ options, correct, onChange }: { options: string[]; correct: number; onChange: (options: string[], correct: number) => void }) {
  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <button type="button" onClick={() => onChange(options, i)} className={cn("grid size-10 shrink-0 place-items-center rounded-xl", correct === i ? "bg-green-600 text-white" : "bg-surface text-ink-muted")} aria-label={`Segna la risposta ${i + 1} come giusta`} aria-pressed={correct === i}>
            <Check className="size-5" />
          </button>
          <Input value={o} aria-label={`Risposta ${i + 1}`} onChange={(e) => onChange(options.map((x, k) => (k === i ? e.target.value : x)), correct)} placeholder={`Risposta ${i + 1}`} />
          {options.length > 2 && (
            <Button variant="ghost" size="icon" onClick={() => onChange(options.filter((_, k) => k !== i), correct >= i && correct > 0 ? correct - 1 : correct)} aria-label="Rimuovi">
              <X className="size-4" />
            </Button>
          )}
        </div>
      ))}
      {options.length < 6 && (
        <Button variant="soft" size="sm" onClick={() => onChange([...options, ""], correct)}>
          + Aggiungi risposta
        </Button>
      )}
      <p className="text-xs text-ink-muted">Tocca ✓ accanto alla risposta giusta.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RandomWeightInput + SchedulePicker
// ---------------------------------------------------------------------------
export function RandomWeightInput({ value, onChange, max = 20, id }: { value: number; onChange: (v: number) => void; max?: number; id?: string }) {
  return (
    <div className="flex items-center gap-3">
      <input id={id} type="range" min={0} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-wine-600" />
      <span className="w-12 rounded-xl bg-surface py-1.5 text-center font-extrabold text-vio-800">{value}</span>
    </div>
  );
}

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SchedulePicker({ value, onChange, id }: { value: string | null; onChange: (v: string | null) => void; id?: string }) {
  return (
    <div className="flex gap-2">
      <Input id={id} type="datetime-local" value={toLocalInput(value)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />
      {value && (
        <Button variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Svuota data">
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PairsEditor (title + text list, e.g. onboarding slides) and NumbersInput
// ---------------------------------------------------------------------------
type Pair = { title: string; text?: string };

export function PairsEditor({ value, onChange, max = 8 }: { value: Pair[]; onChange: (v: Pair[]) => void; max?: number }) {
  const set = (i: number, patch: Partial<Pair>) => onChange(value.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-2">
      {value.map((p, i) => (
        <div key={i} className="space-y-2 rounded-2xl bg-surface/70 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-vio-500">{i + 1}.</span>
            <Input value={p.title} aria-label={`Elemento ${i + 1}: titolo`} onChange={(e) => set(i, { title: e.target.value })} placeholder="Titolo" />
            {value.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="Rimuovi">
                <X className="size-4" />
              </Button>
            )}
          </div>
          <Textarea rows={2} value={p.text ?? ""} aria-label={`Elemento ${i + 1}: testo`} onChange={(e) => set(i, { text: e.target.value })} placeholder="Testo (facoltativo)" />
        </div>
      ))}
      {value.length < max && (
        <Button variant="soft" size="sm" onClick={() => onChange([...value, { title: "", text: "" }])}>
          + Aggiungi
        </Button>
      )}
    </div>
  );
}

export function NumbersInput({ value, onChange, suffix }: { value: number[]; onChange: (v: number[]) => void; suffix?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {value.map((n, i) => (
        <div key={i} className="flex items-center gap-1 rounded-2xl bg-surface px-2 py-1">
          <input type="number" min={0} className="w-20 bg-transparent px-1 py-1 text-center font-bold" value={n} onChange={(e) => onChange(value.map((x, k) => (k === i ? Number(e.target.value) : x)))} aria-label={`Valore ${i + 1}`} />
          {suffix && <span className="text-xs text-ink-muted">{suffix}</span>}
          <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={`Rimuovi ${n}${suffix ? ` ${suffix}` : ""}`} className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-tint-50">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <Button variant="soft" size="sm" onClick={() => onChange([...value, 60])}>
        +
      </Button>
    </div>
  );
}
