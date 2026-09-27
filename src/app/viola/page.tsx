import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight, HeartHandshake, Moon, Sparkles, Sunrise } from "lucide-react";
import { createViolaClient } from "@/server/viola-view";
import { getSettings } from "@/server/settings";
import { requireMember } from "@/server/auth";
import { getHeartState } from "@/server/hearts";
import { HeartExchange } from "@/features/hearts/heart-exchange";
import { getContact } from "@/server/contact";
import { getDailySurprise, getNextCountdown, getTodayMoments, randomPhrase } from "@/server/viola-data";
import { SpecialDay } from "@/features/home/special-day";
import { TapSecret } from "@/features/secrets/tap-secret";
import { WishTime } from "@/features/secrets/wish-time";
import { actionHref } from "@/features/actions/registry";
import { ActionCard } from "@/features/home/action-card";
import { DEFAULT_HOME_MODULES } from "@/features/content/fallbacks";
import { COUNTDOWN_LEADS } from "@/features/content/constants";
import { MoodPicker } from "@/features/mood/mood-picker";
import { LiveCountdown } from "@/features/home/live-countdown";
import { Sparkle, Star5 } from "@/components/decor/stars";
import { Icon } from "@/components/ui/icon";
import { haversineKm, hourIn, todayKey } from "@/utils/dates";
import type { Tables } from "@/db/database.types";

export const metadata = { title: "Home" };

type Module = Tables<"home_modules">;

export default async function ViolaHome() {
  const [settings, viewer] = await Promise.all([getSettings(), requireMember()]);
  const { general, distance } = settings;
  const supabase = await createViolaClient();
  const contact = getContact(settings);

  const [{ data: modules }, phrase] = await Promise.all([
    supabase.from("home_modules").select("*").order("position"),
    randomPhrase("home", "Un passo alla volta."),
  ]);
  const configured = (modules ?? []).filter((m) => m.is_enabled);
  // No home built yet → a sensible default one. And whatever Adam configures,
  // "Ho bisogno di Adam" is always on the home, right after "Aiutami adesso".
  const list = configured.length ? configured : DEFAULT_HOME_MODULES;
  const reachesAdam = list.some((m) => (m.type === "widget" && m.widget === "need_adam") || (m.type === "action" && m.action === "need_adam"));
  if (!reachesAdam) {
    const fallback = DEFAULT_HOME_MODULES.find((m) => m.widget === "need_adam")!;
    const at = list.findIndex((m) => m.widget === "help_now");
    list.splice(at + 1, 0, fallback);
  }
  const widgets = new Set(list.filter((m) => m.type === "widget").map((m) => m.widget));
  const [surprise, countdown, hearts, moments] = await Promise.all([
    widgets.has("daily_surprise") ? getDailySurprise(general.timezone) : null,
    widgets.has("countdown") ? getNextCountdown(general.timezone) : null,
    getHeartState(viewer.id),
    getTodayMoments(general.timezone),
  ]);
  // A heart from Adam is shown even if the "heart" widget is not on the home.
  const heartOnTop = hearts.unseen > 0 && !widgets.has("heart");
  const hour = hourIn(general.timezone);

  // Group consecutive action cards into one grid.
  const blocks: (Module | Module[])[] = [];
  for (const m of list) {
    if (m.type === "action") {
      const last = blocks[blocks.length - 1];
      if (Array.isArray(last)) last.push(m);
      else blocks.push([m]);
    } else blocks.push(m);
  }
  let needsTitleShown = false;

  const renderWidget = (m: Module) => {
    switch (m.widget) {
      case "help_now":
        return (
          <Link
            href="/viola/calma/aiutami"
            className="press btn-3d relative block overflow-hidden rounded-4xl bg-gradient-to-br from-wine-600 via-wine-700 to-wine-900 p-5 text-white"
          >
            <Sparkle className="absolute top-4 right-5 size-5 animate-twinkle text-white/60" />
            <span className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/15">
                <Sparkles className="size-6" />
              </span>
              <span>
                <span className="block font-display text-2xl font-semibold uppercase tracking-wide">{m.title}</span>
                {m.subtitle && <span className="block text-sm text-white/75">{m.subtitle}</span>}
              </span>
            </span>
          </Link>
        );
      case "mood":
        return <MoodPicker title={m.title || "Come ti senti?"} />;
      case "heart":
        return <HeartExchange state={hearts} otherName={general.adamName} title={m.title || undefined} />;
      case "need_adam":
        return (
          <Link href="/viola/adam" className="press btn-3d block rounded-4xl bg-gradient-to-b from-rouge-400 to-rouge-600 p-5 text-center text-xl font-extrabold text-white">
            {m.title}
          </Link>
        );
      case "daily_surprise":
        if (!surprise) return null;
        return (
          <Link href="/viola/oggi" className="press paper relative block overflow-hidden rounded-4xl p-5">
            <Star5 className="absolute -top-1 -right-1 size-10 rotate-12" />
            <p className="text-xs font-extrabold tracking-widest text-vio-500 uppercase">{m.title}</p>
            <p className="mt-2 font-display text-xl font-semibold text-vio-900">{surprise.title}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-vio-600">
              Aprila <ArrowRight className="size-4" />
            </p>
          </Link>
        );
      case "countdown":
        if (!countdown) return null;
        return (
          <Link href="/viola/noi/countdown" className="press block rounded-4xl bg-gradient-to-br from-lilac-100 to-lilac-200 p-5 text-vio-900 shadow-soft">
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-lilac-600 uppercase">
              <Icon name={countdown.icon ?? "hourglass"} className="size-4 text-base" /> {m.title}
            </p>
            <p className="mt-1 mb-3 font-display text-xl font-semibold">{countdown.title}</p>
            <LiveCountdown
              target={countdown.target_at}
              recurring={countdown.recurring_yearly}
              compact
              tz={general.timezone}
              lead={countdown.kind === "meeting" ? settings.texts.countdownMeetingLead : (COUNTDOWN_LEADS[countdown.kind] ?? null)}
              todayText={settings.texts.countdownToday}
            />
          </Link>
        );
      case "distance": {
        const km = Math.round(haversineKm(distance.fromLat, distance.fromLng, distance.toLat, distance.toLng));
        return (
          <Link href="/viola/noi/distanza" className="press paper block rounded-4xl p-5">
            <p className="text-xs font-extrabold tracking-widest text-vio-500 uppercase">{m.title}</p>
            <div className="mt-3 flex items-center gap-3 font-display text-lg font-semibold text-vio-900">
              <span>{distance.fromName}</span>
              <span className="relative h-0.5 flex-1 rounded bg-[repeating-linear-gradient(90deg,var(--color-tint-300)_0_6px,transparent_6px_12px)]">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-heartbeat text-rouge-500">♥</span>
              </span>
              <span>{distance.toName}</span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{km} km · ma il cuore è qui</p>
          </Link>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3 pt-2">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[2.4rem] leading-none font-semibold text-vio-900">
            <TapSecret message={settings.texts.secretMessage}>{general.homeGreeting}</TapSecret>
          </h1>
          <p className="mt-2 text-lg text-ink-soft">{general.homeQuestion}</p>
        </div>
        <Link href="/viola/adam" className="press paper grid size-12 shrink-0 place-items-center rounded-2xl text-rouge-500" aria-label="Ho bisogno di Adam" title="Ho bisogno di Adam">
          <HeartHandshake className="size-6" />
        </Link>
      </header>

      <figure className="paper relative rounded-4xl px-5 py-4">
        <span className="absolute -top-3 left-5 font-display text-5xl leading-none text-blush-300" aria-hidden>
          “
        </span>
        <blockquote className="font-display text-xl leading-snug text-vio-800 italic">{phrase}</blockquote>
        {general.showDaAdam && <figcaption className="mt-1 text-right font-hand text-xl text-vio-500">{general.signature}</figcaption>}
      </figure>

      <WishTime tz={general.timezone} />

      {moments.map((m) => (
        <SpecialDay key={m.id} id={m.id} title={m.title} text={m.description || settings.texts.countdownToday} icon={m.icon} day={todayKey(general.timezone)} />
      ))}

      {heartOnTop && <HeartExchange state={hearts} otherName={general.adamName} />}

      {(hour >= 5 && hour < 12) || hour >= 21 || hour < 5 ? (
        <div className="flex gap-2">
          {hour >= 5 && hour < 12 ? (
            <Link href="/viola/buongiorno" className="press inline-flex items-center gap-2 rounded-full bg-peach-100 px-4 py-2 text-sm font-bold text-vio-800">
              <Sunrise className="size-4" /> Buongiorno ♡
            </Link>
          ) : (
            <Link href="/viola/buonanotte" className="press inline-flex items-center gap-2 rounded-full bg-night-700 px-4 py-2 text-sm font-bold text-moon">
              <Moon className="size-4" /> Buonanotte ♡
            </Link>
          )}
        </div>
      ) : null}

      {blocks.map((b, i) => {
        if (Array.isArray(b)) {
          const cards = b
            .map((m) => ({ m, href: actionHref(m.action, contact, m.url) }))
            .filter((x): x is { m: Module; href: string } => Boolean(x.href));
          if (!cards.length) return null;
          const showTitle = !needsTitleShown;
          needsTitleShown = true;
          return (
            <section key={`g${i}`} aria-labelledby={showTitle ? "needs-title" : undefined}>
              {showTitle && (
                <h2 id="needs-title" className="mb-3 px-1 font-sans text-xs font-extrabold tracking-[0.18em] text-vio-500 uppercase">
                  {general.needsTitle}
                </h2>
              )}
              <div className="grid grid-cols-2 gap-3">
                {cards.map(({ m, href }, k) => (
                  <ActionCard
                    key={m.id}
                    href={href}
                    title={m.title}
                    subtitle={m.subtitle}
                    icon={m.icon}
                    color={m.color}
                    wide={m.size === "lg"}
                    index={k}
                  />
                ))}
              </div>
            </section>
          );
        }
        const w = renderWidget(b);
        return w ? <Fragment key={b.id}>{w}</Fragment> : null;
      })}
    </div>
  );
}
