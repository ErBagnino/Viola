"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { cn } from "@/utils/cn";
import { BreathingVisual } from "./breathing-visual";
import { cycleSeconds, PHASE_LABEL, stateAt, type BreathingPattern } from "./cycle";
import type { BreathingPhoto, BreathingPresetView } from "./types";

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
      .request("screen")
      .then((l) => (lock = l))
      .catch(() => undefined);
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, [active]);
}

export function BreathingSession({
  preset,
  photos,
  phrases,
  endText,
  onClose,
  tone = "light",
}: {
  preset: BreathingPresetView;
  photos: BreathingPhoto[];
  phrases: string[];
  endText: string;
  onClose: () => void;
  tone?: "light" | "night";
}) {
  const pattern: BreathingPattern = useMemo(
    () => ({ inhale: preset.inhale, hold: preset.hold, exhale: preset.exhale, holdAfter: preset.holdAfter, rounds: preset.rounds }),
    [preset],
  );
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [soundOn, setSoundOn] = useState(Boolean(preset.audioUrl));
  const last = useRef<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const lastPhase = useRef<string>("");
  const logged = useRef(false);

  const state = stateAt(pattern, elapsed);
  const cycle = cycleSeconds(pattern);
  useWakeLock(running && !state.done);

  // 3-2-1 lead-in so she has time to settle.
  const [lead, setLead] = useState(3);
  const started = lead <= 0;
  useEffect(() => {
    if (started) return;
    const t = setTimeout(() => setLead((v) => v - 1), 800);
    return () => clearTimeout(t);
  }, [lead, started]);

  useEffect(() => {
    if (!started || !running || state.done) {
      last.current = null;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      if (last.current !== null) setElapsed((e) => e + (now - last.current!) / 1000);
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, running, state.done]);

  // Gentle haptic tick on every phase change (Android).
  useEffect(() => {
    const key = `${state.round}:${state.phase}`;
    if (started && key !== lastPhase.current) {
      lastPhase.current = key;
      if ("vibrate" in navigator) navigator.vibrate?.(state.phase === "inhale" ? 25 : 12);
    }
  }, [state.round, state.phase, started]);

  useEffect(() => {
    if (state.done && !logged.current) {
      logged.current = true;
      track("breathing_completed", { preset: preset.name.slice(0, 60), rounds: pattern.rounds ?? 0 });
    }
  }, [state.done, preset.name, pattern.rounds]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (soundOn && running && started && !state.done) a.play().catch(() => undefined);
    else a.pause();
  }, [soundOn, running, started, state.done]);

  const restart = useCallback(() => {
    setElapsed(0);
    logged.current = false;
    setRunning(true);
  }, []);

  const photo = preset.showPhotos && preset.photoMode !== "none" && photos.length ? photos[state.round % photos.length] : null;
  const reveal = Math.min(1, elapsed / Math.max(1, cycle * 2)) * 0.6 + state.expansion * 0.4;
  const blur = preset.photoMode === "blur_to_clear" ? 14 * (1 - reveal) : 0;
  const opacity = preset.photoMode === "fade" ? 0.25 + state.expansion * 0.75 : 1;
  const phrase = photo?.text || (phrases.length ? phrases[state.round % phrases.length] : "");
  const night = tone === "night";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex flex-col items-center justify-between overflow-hidden px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]",
        night ? "bg-gradient-to-b from-night-900 via-night-800 to-night-700 text-moon" : "bg-gradient-to-b from-lilac-100 via-blush-50 to-peach-100 text-wine-900",
      )}
    >
      {preset.audioUrl && <audio ref={audio} src={preset.audioUrl} loop preload="none" />}
      <HeartBurst show={state.done} />

      <div className="flex w-full max-w-md items-center justify-between">
        <button type="button" onClick={onClose} className={cn("press grid size-11 place-items-center rounded-2xl", night ? "bg-white/10" : "paper")} aria-label="Chiudi">
          <X className="size-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold opacity-70">{preset.name}</p>
          {pattern.rounds && !state.done && started && (
            <p className="text-xs font-bold opacity-60">
              Respiro {Math.min(state.round + 1, pattern.rounds)} di {pattern.rounds}
            </p>
          )}
        </div>
        {preset.audioUrl ? (
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            className={cn("press grid size-11 place-items-center rounded-2xl", night ? "bg-white/10" : "paper")}
            aria-label={soundOn ? "Disattiva suono" : "Attiva suono"}
          >
            {soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
        ) : (
          <span className="size-11" />
        )}
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="relative aspect-square w-[min(78vw,22rem)]">
          <BreathingVisual visual={preset.visual} expansion={started ? state.expansion : 0.15} photoUrl={photo?.url} blur={blur} photoOpacity={opacity} />
        </div>

        <div className="mt-6 min-h-28 text-center" aria-live="polite">
          <AnimatePresence mode="wait">
            {!started ? (
              <motion.p key="lead" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="font-display text-5xl font-semibold">
                {lead > 0 ? lead : "♡"}
              </motion.p>
            ) : state.done ? (
              <motion.div key="done" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <p className="font-display text-3xl font-semibold text-balance">{endText}</p>
              </motion.div>
            ) : (
              <motion.div key={state.phase} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}>
                <p className="font-display text-4xl font-semibold tracking-wide uppercase">{PHASE_LABEL[state.phase]}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums opacity-70">{state.secondsLeft}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {started && !state.done && phrase && <p className="mt-3 font-hand text-2xl opacity-80">{phrase}</p>}
        </div>
      </div>

      <div className="flex w-full max-w-md gap-3">
        {state.done ? (
          <>
            <Button variant={night ? "night" : "soft"} size="lg" className="flex-1" onClick={restart}>
              <RotateCcw className="size-5" /> Ancora
            </Button>
            <Button size="lg" className="flex-1" onClick={onClose}>
              Fatto ♡
            </Button>
          </>
        ) : (
          <Button
            variant={night ? "night" : "white"}
            size="lg"
            className="flex-1"
            onClick={() => setRunning((r) => !r)}
            disabled={!started}
          >
            {running ? (
              <>
                <Pause className="size-5" /> Pausa
              </>
            ) : (
              <>
                <Play className="size-5" /> Riprendi
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
