import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Markdown } from "@/components/ui/markdown";
import { Star5, Sparkle } from "@/components/decor/stars";
import { APP_ACTIONS, actionHref, isAppAction } from "@/features/actions/registry";
import { getSettings } from "@/server/settings";
import { getContact } from "@/server/contact";
import { getDailySurprise, randomPhrase } from "@/server/viola-data";
import { formatDate } from "@/utils/dates";

export const metadata = { title: "Una cosa per te" };

const EYEBROW: Record<string, string> = {
  photo: "Una foto per te",
  memory: "Un ricordo per te",
  dedication: "Una dedica per te",
  question: "Una domanda per te",
  mini_game: "Un gioco per te",
  exercise: "Un momento per te",
  phrase: "Una frase per te",
  surprise: "Una sorpresa per te",
};

export default async function OggiPage() {
  const settings = await getSettings();
  const [s, daAdam] = await Promise.all([getDailySurprise(settings.general.timezone), randomPhrase("da_adam", "Da Adam ♡")]);
  const contact = getContact(settings);
  const href = s ? actionHref(s.action, contact) : null;
  return (
    <div>
      <PageHeader title="Una cosa per te ♡" subtitle={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })} back="/viola" />
      {s ? (
        <article className="paper relative overflow-visible rounded-[2rem]">
          <Star5 className="absolute -top-3 -right-2 z-10 size-11 rotate-12" />
          <Sparkle outline className="absolute -bottom-2 -left-2 z-10 size-7 text-white" />
          {s.media && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.media.url} alt="" className="aspect-[4/3] w-full rounded-t-[2rem] object-cover" />
          )}
          <div className="p-6">
            <p className="text-xs font-extrabold tracking-widest text-wine-500 uppercase">{EYEBROW[s.kind] ?? "Per te"}</p>
            <h2 className="mt-1 font-display text-[1.8rem] leading-tight font-semibold text-wine-900">{s.title}</h2>
            {s.body && <Markdown className="mt-3 text-[17px] text-ink-soft">{s.body}</Markdown>}
            {href && isAppAction(s.action) && (
              <Link href={href} className="press btn-3d mt-5 block rounded-[1.25rem] bg-gradient-to-b from-wine-500 to-wine-700 px-6 py-4 text-center font-extrabold text-white">
                {APP_ACTIONS[s.action].label}
              </Link>
            )}
            {settings.general.showDaAdam && <p className="mt-5 text-right font-hand text-2xl text-wine-500">{daAdam}</p>}
          </div>
        </article>
      ) : (
        <p className="paper rounded-4xl p-6 text-center text-ink-soft">Oggi la sorpresa sei tu ♡</p>
      )}
    </div>
  );
}
