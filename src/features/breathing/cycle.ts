// Pure breathing-cycle maths (unit tested).

export type Phase = "inhale" | "hold" | "exhale" | "rest";

export type BreathingPattern = {
  inhale: number;
  hold: number;
  exhale: number;
  holdAfter: number;
  /** null = free (no end) */
  rounds: number | null;
};

export const PHASE_LABEL: Record<Phase, string> = {
  inhale: "Inspira",
  hold: "Trattieni",
  exhale: "Espira",
  rest: "Pausa",
};

export function phaseList(p: BreathingPattern): { phase: Phase; seconds: number }[] {
  return (
    [
      { phase: "inhale", seconds: p.inhale },
      { phase: "hold", seconds: p.hold },
      { phase: "exhale", seconds: p.exhale },
      { phase: "rest", seconds: p.holdAfter },
    ] as { phase: Phase; seconds: number }[]
  ).filter((x) => x.seconds > 0);
}

export function cycleSeconds(p: BreathingPattern) {
  return phaseList(p).reduce((s, x) => s + x.seconds, 0);
}

export function totalSeconds(p: BreathingPattern) {
  return p.rounds === null ? Infinity : cycleSeconds(p) * p.rounds;
}

const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2;

export type BreathingState = {
  round: number;
  phase: Phase;
  phaseElapsed: number;
  phaseDuration: number;
  /** seconds left in the phase, rounded up (for the counter) */
  secondsLeft: number;
  /** 0 = smallest, 1 = fully expanded */
  expansion: number;
  done: boolean;
};

export function stateAt(p: BreathingPattern, elapsed: number): BreathingState {
  const list = phaseList(p);
  const cycle = cycleSeconds(p);
  if (!list.length || cycle <= 0) {
    return { round: 0, phase: "rest", phaseElapsed: 0, phaseDuration: 0, secondsLeft: 0, expansion: 0, done: true };
  }
  const total = totalSeconds(p);
  if (elapsed >= total) {
    return { round: (p.rounds ?? 1) - 1, phase: "rest", phaseElapsed: 0, phaseDuration: 0, secondsLeft: 0, expansion: 0, done: true };
  }
  const t = Math.max(0, elapsed);
  const round = Math.floor(t / cycle);
  let within = t - round * cycle;
  for (const { phase, seconds } of list) {
    if (within < seconds) {
      const k = within / seconds;
      const expansion = phase === "inhale" ? easeInOut(k) : phase === "hold" ? 1 : phase === "exhale" ? 1 - easeInOut(k) : 0;
      return {
        round,
        phase,
        phaseElapsed: within,
        phaseDuration: seconds,
        secondsLeft: Math.max(1, Math.ceil(seconds - within)),
        expansion,
        done: false,
      };
    }
    within -= seconds;
  }
  return { round, phase: "rest", phaseElapsed: 0, phaseDuration: 0, secondsLeft: 0, expansion: 0, done: false };
}

export const DEFAULT_PATTERN: BreathingPattern = { inhale: 4, hold: 4, exhale: 6, holdAfter: 0, rounds: 8 };
