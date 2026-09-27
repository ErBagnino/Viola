"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/features/activity/track";
import { useLocalStorage } from "@/hooks/use-local-storage";

type Heart = { id: number; x: number; y: number; s: number };
const DURATION = 30;

export function ReactionGame() {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [bestRaw, setBestRaw] = useLocalStorage("vio:reaction-best", "0");
  const best = Number(bestRaw) || 0;
  const id = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    const spawn = setInterval(() => {
      id.current += 1;
      const h = { id: id.current, x: 8 + Math.random() * 78, y: 6 + Math.random() * 80, s: 0.8 + Math.random() * 0.7 };
      setHearts((hs) => [...hs.slice(-6), h]);
      setTimeout(() => setHearts((hs) => hs.filter((x) => x.id !== h.id)), 1300);
    }, 650);
    const end = setTimeout(() => {
      setRunning(false);
      setHearts([]);
      const final = scoreRef.current;
      track("game_played", { game: "reaction", score: final });
      let prev = 0;
      try {
        prev = Number(localStorage.getItem("vio:reaction-best") ?? 0);
      } catch {
        /* ignore */
      }
      if (final > prev) setBestRaw(String(final));
    }, DURATION * 1000);
    return () => {
      clearInterval(tick);
      clearInterval(spawn);
      clearTimeout(end);
    };
  }, [running, setBestRaw]);

  const hit = (hid: number) => {
    scoreRef.current += 1;
    setScore(scoreRef.current);
    setHearts((hs) => hs.filter((x) => x.id !== hid));
    if ("vibrate" in navigator) navigator.vibrate?.(10);
  };

  const startGame = () => {
    scoreRef.current = 0;
    setScore(0);
    setLeft(DURATION);
    setRunning(true);
  };

  return (
    <div>
      <div className="mb-3 flex justify-between text-sm font-bold text-wine-700">
        <span>Cuori: {score}</span>
        <span>Record: {best}</span>
        <span>{running ? `${left}s` : ""}</span>
      </div>
      <div className="relative h-[55vh] min-h-80 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blush-100 via-cream-50 to-lilac-100 shadow-soft">
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.button
              key={h.id}
              type="button"
              className="absolute text-5xl"
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              initial={{ scale: 0 }}
              animate={{ scale: h.s }}
              exit={{ scale: 0, opacity: 0 }}
              onPointerDown={() => hit(h.id)}
              aria-label="Cuore"
            >
              💗
            </motion.button>
          ))}
        </AnimatePresence>
        {!running && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="font-display text-2xl font-semibold text-wine-900">{left <= 0 ? `${score} cuori presi! ♡` : "Acchiappa i cuori"}</p>
              <p className="mt-1 text-ink-soft">30 secondi. Tocca più cuori che puoi.</p>
              <Button
                className="mt-4"
                size="lg"
                onClick={startGame}
              >
                <Play className="size-5" /> {left <= 0 ? "Ancora" : "Via!"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
