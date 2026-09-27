import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Quiz } from "@/features/games/quiz";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Quanto mi conosci?" };

export default async function Page() {
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([supabase.from("quiz_questions").select("*").order("position"), getSettings()]);
  const qs = (data ?? [])
    .filter((q) => q.options.length >= 2 && q.correct_index < q.options.length)
    .map((q) => ({ id: q.id, question: q.question, options: q.options, correct: q.correct_index, explanation: q.explanation }));
  return (
    <div>
      <PageHeader title="Quanto mi conosci?" back="/viola/giochi" />
      {qs.length ? <Quiz questions={qs} texts={{ perfect: settings.texts.quizPerfect, good: settings.texts.quizGood, low: settings.texts.quizLow }} /> : <EmptyState title="Le domande stanno arrivando" text={`${settings.general.adamName} sta preparando il quiz ♡`} />}
    </div>
  );
}
