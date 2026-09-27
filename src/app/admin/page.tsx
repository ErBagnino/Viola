import Link from "next/link";
import { ArrowRight, Bell, Camera, MailPlus, Wand2 } from "lucide-react";
import { AdminHeader } from "@/components/layout/admin-header";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { getNotificationStatus } from "@/server/notifications/status";
import { getHeartState } from "@/server/hearts";
import { HeartExchange } from "@/features/hearts/heart-exchange";
import { NextSteps, ReadinessHero } from "@/features/readiness/readiness-hero";
import { getReadiness } from "@/server/readiness";
import { MOODS } from "@/features/content/constants";
import { formatDateTime, relativeTime, todayKey } from "@/utils/dates";
import { cn } from "@/utils/cn";

export const metadata = { title: "Dashboard" };

const STATE_CLS = { CONNECTED: "bg-green-100 text-green-800", DISCONNECTED: "bg-peach-100 text-vio-800", "NOT CONFIGURED": "bg-cream-200 text-ink-soft" } as const;

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const settings = await getSettings();
  const supabase = await createClient();
  const tz = settings.general.timezone;
  const viola = settings.general.violaName;

  const [reqNew, reqRecent, msgUnread, msgRecent, moods, photos, dedications, memories, usage, activity, status] = await Promise.all([
    supabase.from("adam_requests").select("*").eq("status", "new").order("created_at", { ascending: false }),
    supabase.from("adam_requests").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(4),
    supabase.from("mood_entries").select("*").order("created_at", { ascending: false }).limit(7),
    supabase.from("media").select("id", { count: "exact", head: true }).eq("kind", "image"),
    supabase.from("dedications").select("id", { count: "exact", head: true }),
    supabase.from("memories").select("id", { count: "exact", head: true }),
    supabase.from("ai_usage_daily").select("*").eq("day", todayKey(tz)),
    supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(6),
    getNotificationStatus(settings, admin.id),
  ]);
  const [hearts, readiness] = await Promise.all([getHeartState(admin.id), getReadiness(admin.id, settings)]);

  const urgent = reqNew.data ?? [];
  const aiReq = (usage.data ?? []).filter((u) => u.scope === "viola").reduce((s, u) => s + u.requests, 0);
  const lastMood = moods.data?.[0];

  return (
    <div className="space-y-5">
      <AdminHeader title={`Ciao ${settings.general.adamName} ♡`} description={`Ecco come va il piccolo mondo di ${viola}.`} />

      {urgent.length > 0 ? (
        <Link href="/admin/richieste" className="press btn-3d relative block overflow-hidden rounded-4xl bg-gradient-to-br from-rouge-400 to-rouge-600 p-6 text-white">
          <span className="absolute -top-6 -right-6 size-32 animate-heartbeat rounded-full bg-white/10" aria-hidden />
          <p className="text-sm font-extrabold tracking-widest uppercase opacity-90">Urgente</p>
          <p className="mt-1 font-display text-3xl font-semibold">♡ {viola} ha bisogno di te</p>
          <p className="mt-2 text-white/85">
            {urgent.length === 1 ? "1 richiesta nuova" : `${urgent.length} richieste nuove`} · l&apos;ultima {relativeTime(urgent[0].created_at)}
            {urgent[0].message ? ` — "${urgent[0].message}"` : ""}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-extrabold text-rouge-600">
            Apri <ArrowRight className="size-4" />
          </span>
        </Link>
      ) : (
        <div className="paper rounded-4xl p-5">
          <p className="font-display text-xl font-semibold text-vio-900">Tutto tranquillo ♡</p>
          <p className="text-sm text-ink-soft">Nessuna richiesta aperta. Quando {viola} premerà &quot;Ho bisogno di Adam&quot; la vedrai qui (e riceverai una notifica).</p>
        </div>
      )}

      <ReadinessHero summary={readiness.summary} violaName={viola} link />
      <NextSteps summary={readiness.summary} />

      <HeartExchange state={hearts} otherName={viola} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Messaggi da leggere", value: msgUnread.count ?? 0, href: "/admin/messaggi", icon: "mail-heart" },
          { label: "Ultimo umore", value: lastMood ? (lastMood.mood ? MOODS[lastMood.mood - 1]?.emoji : "🤷") : "—", sub: lastMood ? relativeTime(lastMood.created_at) : "", href: "/admin/umore", icon: "smile" },
          { label: "Foto", value: photos.count ?? 0, href: "/admin/foto", icon: "images" },
          { label: "Dediche · Ricordi", value: `${dedications.count ?? 0} · ${memories.count ?? 0}`, href: "/admin/dediche", icon: "book-heart" },
          { label: "Adam AI oggi", value: `${aiReq}/${settings.ai.dailyMessageLimit}`, href: "/admin/costi", icon: "bot-heart" },
        ].map((t) => (
          <Link key={t.label} href={t.href} className="press paper rounded-3xl p-4">
            <Icon name={t.icon} className="size-5 text-vio-500" />
            <p className="mt-2 font-display text-2xl font-semibold text-vio-900">{t.value}</p>
            <p className="text-xs font-bold text-ink-muted">{t.label}</p>
            {"sub" in t && t.sub ? <p className="text-[11px] text-ink-muted">{t.sub}</p> : null}
          </Link>
        ))}
        <Link href="/admin/notifiche" className="press paper rounded-3xl p-4">
          <Bell className="size-5 text-vio-500" />
          <div className="mt-2 space-y-1">
            {(["telegram", "webpush", "whatsapp"] as const).map((c) => (
              <p key={c} className="flex items-center justify-between gap-2 text-xs font-bold">
                <span className="capitalize text-vio-900">{c === "webpush" ? "Web Push" : c}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px]", STATE_CLS[status[c].state])}>{status[c].state}</span>
              </p>
            ))}
          </div>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { href: "/admin/foto", label: "Carica foto", icon: Camera },
          { href: "/admin/dediche", label: "Nuova dedica", icon: MailPlus },
          { href: "/admin/copilot", label: "AI Copilot", icon: Wand2 },
          { href: "/viola", label: "Guarda come Viola", icon: ArrowRight },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="press flex items-center gap-2 rounded-2xl bg-wine-700 px-4 py-3 text-sm font-extrabold text-white shadow-soft">
            <a.icon className="size-4" /> {a.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="paper rounded-4xl p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-vio-900">Richieste recenti</h2>
          {(reqRecent.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Nessuna richiesta.</p>
          ) : (
            <ul className="space-y-2">
              {reqRecent.data!.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-2xl bg-surface/70 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <b>{formatDateTime(r.created_at, tz)}</b> {r.message ? `· ${r.message}` : ""}
                  </span>
                  <span className="shrink-0 rounded-full bg-lilac-100 px-2 py-0.5 text-[11px] font-extrabold text-lilac-600 uppercase">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="paper rounded-4xl p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-vio-900">Ultimi messaggi</h2>
          {(msgRecent.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Nessun messaggio.</p>
          ) : (
            <ul className="space-y-2">
              {msgRecent.data!.map((m) => (
                <li key={m.id} className="rounded-2xl bg-surface/70 px-3 py-2 text-sm">
                  <span className="text-xs font-bold text-ink-muted">{formatDateTime(m.created_at, tz)}</span>
                  {!m.read_at && <span className="ml-2 rounded-full bg-rouge-500 px-1.5 text-[10px] font-extrabold text-white">NUOVO</span>}
                  <p className="line-clamp-2 text-vio-900">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="paper rounded-4xl p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-vio-900">Umore (condiviso)</h2>
          <div className="flex flex-wrap gap-2">
            {(moods.data ?? []).length === 0 && <p className="text-sm text-ink-muted">Nessun umore condiviso.</p>}
            {(moods.data ?? []).map((m) => (
              <span key={m.id} className="rounded-2xl bg-surface/80 px-3 py-2 text-center" title={formatDateTime(m.created_at, tz)}>
                <span className="block text-2xl">{m.mood ? MOODS[m.mood - 1]?.emoji : "🤷"}</span>
                <span className="text-[10px] font-bold text-ink-muted">{relativeTime(m.created_at)}</span>
              </span>
            ))}
          </div>
        </section>
        <section className="paper rounded-4xl p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-vio-900">Attività recente</h2>
          {(activity.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Ancora nessuna attività.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {activity.data!.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span className="font-bold text-vio-900">{a.type.replace(/_/g, " ")}</span>
                  <span className="text-ink-muted">{relativeTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
