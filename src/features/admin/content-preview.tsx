"use client";

import { useEffect, useState } from "react";
import { EyeOff, Lock } from "lucide-react";
import { LetterView } from "@/features/letters/letter-view";
import { LiveCountdown } from "@/features/home/live-countdown";
import { Markdown } from "@/components/ui/markdown";
import { Icon } from "@/components/ui/icon";
import { isDarkTone, toneClass } from "@/components/ui/card";
import { COUNTDOWN_LEADS, DEDICATION_CATEGORIES, MEMORY_KINDS } from "@/features/content/constants";
import { callAction } from "@/utils/call-action";
import { formatDate } from "@/utils/dates";
import { cn } from "@/utils/cn";
import { mediaPreview } from "./media-actions";

/** Names and texts the previews need (from the settings). */
export type PreviewContext = { adamName: string; violaName: string; signature: string; timezone: string; meetingLead: string; todayText: string; daAdam: string };

export const PREVIEWABLE = new Set(["dedications", "open_when_cards", "memories", "countdowns", "daily_surprises", "time_capsules", "phrases", "quiz_questions"]);

type Media = { url: string; shared: boolean } | null;

function useMedia(id: unknown): Media {
  const [media, setMedia] = useState<{ id: string; value: Media } | null>(null);
  const key = typeof id === "string" && id ? id : null;
  useEffect(() => {
    if (!key) return;
    let alive = true;
    void callAction(() => mediaPreview(key)).then((r) => {
      if (alive) setMedia({ id: key, value: r.ok && r.item ? { url: r.item.url, shared: r.item.shared } : null });
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return key && media?.id === key ? media.value : null;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

function Notes({ values, media, violaName }: { values: Record<string, unknown>; media: Media; violaName: string }) {
  const notes: string[] = [];
  if (values.is_published === false || values.is_active === false) notes.push(`Non è pubblicato: ${violaName} ancora non lo vede.`);
  if (media && !media.shared) notes.push(`La foto è privata: ${violaName} non la vedrà.`);
  const at = str(values.publish_at);
  if (at && new Date(at) > new Date()) notes.push(`Comparirà dal ${formatDate(at)}.`);
  if (!notes.length) return null;
  return (
    <div className="mb-3 space-y-1">
      {notes.map((n) => (
        <p key={n} className="flex items-center gap-2 rounded-2xl bg-peach-100 px-3 py-2 text-xs font-bold text-vio-800">
          <EyeOff className="size-4 shrink-0" /> {n}
        </p>
      ))}
    </div>
  );
}

/**
 * "Come la vede Viola": the item drawn with the same pieces as her screens,
 * from the values being edited (nothing is saved).
 */
export function ContentPreview({ resourceKey, values, ctx }: { resourceKey: string; values: Record<string, unknown>; ctx: PreviewContext }) {
  const media = useMedia(values.media_id);
  const image = media ? { url: media.url } : null;
  const title = str(values.title) || "(senza titolo)";
  const body = str(values.body);
  const frame = (children: React.ReactNode) => (
    <div>
      <Notes values={values} media={media} violaName={ctx.violaName} />
      <div className="rounded-[2rem] bg-canvas p-4 ring-1 ring-line">
        <p className="mb-3 text-center text-[11px] font-extrabold tracking-widest text-ink-muted uppercase">Così la vede {ctx.violaName}</p>
        {children}
      </div>
    </div>
  );

  switch (resourceKey) {
    case "dedications":
      return frame(
        <div className="rounded-[1.75rem] bg-surface p-5 shadow-soft">
          <p className="mb-1 text-xs font-extrabold tracking-widest text-vio-500 uppercase">{DEDICATION_CATEGORIES[str(values.category)] ?? ""}</p>
          <LetterView eyebrow={ctx.daAdam} title={title} body={body} image={image} signature={str(values.signature) || ctx.signature} />
        </div>,
      );
    case "open_when_cards": {
      const color = str(values.color) || "blush";
      const dark = isDarkTone(color);
      return frame(
        <div className="space-y-4">
          <div className={cn("relative mx-auto aspect-[4/5] w-40 overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-4 text-left shadow-soft", toneClass(color))}>
            <span className="absolute inset-x-0 top-0 h-1/2 bg-white/25 [clip-path:polygon(0_0,100%_0,50%_75%)]" aria-hidden />
            <span className={cn("absolute top-[30%] left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full shadow", dark ? "bg-surface text-vio-700" : "bg-wine-600 text-white")} aria-hidden>
              <Icon name={str(values.icon) || "heart"} className="size-5" />
            </span>
            <span className="absolute inset-x-4 bottom-4">
              <span className={cn("block text-[11px] font-extrabold tracking-widest uppercase", dark ? "text-white/70" : "text-vio-500")}>Aprimi quando…</span>
              <span className="mt-1 block text-[15px] leading-snug font-extrabold text-balance">{title.replace(/^aprimi quando\s*/i, "")}</span>
            </span>
          </div>
          <div className="rounded-[1.75rem] bg-surface p-5 shadow-soft">
            <LetterView title={title} body={body} image={image} signature={ctx.signature} />
          </div>
        </div>,
      );
    }
    case "memories": {
      const kind = MEMORY_KINDS[str(values.kind)];
      const when = str(values.happened_on);
      return frame(
        <article className="rounded-[1.75rem] bg-surface p-5 shadow-soft">
          <p className="text-xs font-extrabold tracking-widest text-vio-500 uppercase">
            {kind ? `${kind.emoji} ${kind.label}` : ""}
            {when ? ` · ${formatDate(when)}` : ""}
          </p>
          <h3 className="mt-1 font-display text-2xl leading-tight font-semibold text-vio-900">{title}</h3>
          {str(values.place) && <p className="mt-1 text-sm font-bold text-ink-soft">📍 {str(values.place)}</p>}
          {image && (
            <div className="polaroid mt-4 rotate-[-1.5deg] rounded-2xl bg-white p-2 pb-6 shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
            </div>
          )}
          {body && <Markdown className="mt-4 text-[16px] text-ink">{body}</Markdown>}
        </article>,
      );
    }
    case "countdowns": {
      const kind = str(values.kind);
      const target = str(values.target_at);
      return frame(
        <div className="rounded-4xl bg-gradient-to-br from-lilac-100 to-lilac-200 p-5 text-vio-900 shadow-soft">
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-lilac-600 uppercase">
            <Icon name={str(values.icon) || "hourglass"} className="size-4 text-base" /> Conto alla rovescia
          </p>
          <p className="mt-1 mb-3 font-display text-xl font-semibold">{title}</p>
          {target && !Number.isNaN(Date.parse(target)) ? (
            <LiveCountdown
              target={new Date(target).toISOString()}
              recurring={Boolean(values.recurring_yearly)}
              compact
              tz={ctx.timezone}
              lead={kind === "meeting" ? ctx.meetingLead : (COUNTDOWN_LEADS[kind] ?? null)}
              todayText={ctx.todayText}
            />
          ) : (
            <p className="text-sm font-bold text-ink-soft">Scegli la data per vedere quanto manca.</p>
          )}
        </div>,
      );
    }
    case "daily_surprises":
      return frame(
        <div className="rounded-[1.75rem] bg-surface p-5 shadow-soft">
          <p className="font-hand text-xl text-vio-500">La sorpresa di oggi ♡</p>
          <LetterView title={title} body={body} image={image} />
        </div>,
      );
    case "time_capsules": {
      const unlock = str(values.unlock_at);
      return frame(
        <div className="space-y-3">
          <div className="rounded-[1.75rem] bg-gradient-to-br from-night-700 to-night-900 p-5 text-moon shadow-soft">
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-white/70 uppercase">
              <Lock className="size-4" /> Prima di aprirla
            </p>
            <p className="mt-1 font-display text-xl font-semibold">{title}</p>
            {str(values.teaser) && <p className="mt-1 text-sm text-white/80">{str(values.teaser)}</p>}
            <p className="mt-3 text-sm font-bold">{unlock ? `Si apre il ${formatDate(unlock)}` : "Scegli quando si apre"}</p>
          </div>
          <div className="rounded-[1.75rem] bg-surface p-5 shadow-soft">
            <p className="mb-1 text-xs font-extrabold tracking-widest text-vio-500 uppercase">Quando si apre</p>
            <LetterView title={title} body={body} image={image} signature={ctx.signature} />
          </div>
        </div>,
      );
    }
    case "phrases":
      return frame(
        <div className="rounded-[1.75rem] bg-surface p-6 text-center shadow-soft">
          <p className="font-hand text-2xl leading-snug text-vio-700">{str(values.text) || "…"}</p>
        </div>,
      );
    case "quiz_questions": {
      const options = Array.isArray(values.options) ? (values.options as string[]) : [];
      const correct = Number(values.correct_index ?? 0);
      return frame(
        <div className="rounded-[1.75rem] bg-surface p-5 shadow-soft">
          <p className="font-display text-xl font-semibold text-vio-900">{str(values.question) || "La tua domanda"}</p>
          <div className="mt-3 grid gap-2">
            {options.map((o, i) => (
              <p key={i} className={cn("rounded-2xl px-4 py-3 text-sm font-bold ring-1", i === correct ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800" : "bg-tint-50 text-vio-800 ring-line")}>
                {o || "…"} {i === correct && "✓"}
              </p>
            ))}
          </div>
          {str(values.explanation) && <p className="mt-3 text-sm text-ink-soft">{str(values.explanation)}</p>}
        </div>,
      );
    }
    default:
      return null;
  }
}
