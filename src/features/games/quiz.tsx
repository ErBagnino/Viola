"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { cn } from "@/utils/cn";

export type QuizQuestion = { id: string; question: string; options: string[]; correct: number; explanation: string | null };

export function Quiz({ questions, texts }: { questions: QuizQuestion[]; texts: { perfect: string; good: string; low: string } }) {
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= questions.length;
  const q = questions[i];

  const choose = (k: number) => {
    if (answer !== null) return;
    setAnswer(k);
    if (k === q.correct) setScore((s) => s + 1);
  };
  const next = () => {
    setAnswer(null);
    setI((v) => v + 1);
    if (i + 1 >= questions.length) track("game_played", { game: "quiz", score: score, total: questions.length });
  };

  if (done) {
    const pct = score / questions.length;
    return (
      <div className="text-center">
        <HeartBurst show />
        <p className="text-6xl">{pct === 1 ? "🏆" : pct >= 0.6 ? "🥰" : "😘"}</p>
        <p className="mt-3 font-display text-3xl font-semibold text-vio-900">
          {score} su {questions.length}
        </p>
        <p className="mt-2 text-ink-soft">
          {pct === 1 ? texts.perfect : pct >= 0.6 ? texts.good : texts.low}
        </p>
        <Button
          variant="soft"
          className="mt-6 w-full"
          onClick={() => {
            setI(0);
            setScore(0);
            setAnswer(null);
          }}
        >
          <RotateCcw className="size-4" /> Rigioca
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-tint-100">
        <motion.div className="h-full bg-wine-500" animate={{ width: `${(i / questions.length) * 100}%` }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
          <p className="text-xs font-extrabold tracking-widest text-vio-500 uppercase">
            Domanda {i + 1} di {questions.length}
          </p>
          <h2 className="mt-2 font-display text-2xl leading-snug font-semibold text-vio-900">{q.question}</h2>
          <div className="mt-5 grid gap-2.5">
            {q.options.map((o, k) => {
              const state = answer === null ? "idle" : k === q.correct ? "right" : k === answer ? "wrong" : "idle";
              return (
                <motion.button
                  key={k}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  animate={state === "wrong" ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                  onClick={() => choose(k)}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-3.5 text-left font-bold transition",
                    state === "right" && "border-green-500 bg-green-50 text-green-800",
                    state === "wrong" && "border-rouge-400 bg-blush-100 text-vio-800",
                    state === "idle" && "border-transparent bg-surface text-vio-900 shadow-soft",
                  )}
                >
                  {o}
                </motion.button>
              );
            })}
          </div>
          {answer !== null && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <p className="font-bold text-vio-800">{answer === q.correct ? "Giusto! ♡" : "Quasi…"}</p>
              {q.explanation && <p className="text-ink-soft">{q.explanation}</p>}
              <Button className="mt-4 w-full" size="lg" onClick={next}>
                {i + 1 < questions.length ? "Prossima" : "Risultato"}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
