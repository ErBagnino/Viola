// Randomness helpers used by the comfort engine, surprises and photos.

export type Weighted = { weight?: number | null };

/** Picks one item proportionally to `weight` (default 1). */
export function weightedPick<T extends Weighted>(items: readonly T[], rand: () => number = Math.random): T | null {
  const pool = items.filter((i) => (i.weight ?? 1) > 0);
  if (pool.length === 0) return null;
  const total = pool.reduce((s, i) => s + (i.weight ?? 1), 0);
  let r = rand() * total;
  for (const item of pool) {
    r -= item.weight ?? 1;
    if (r < 0) return item;
  }
  return pool[pool.length - 1];
}

/**
 * Weighted pick that avoids the most recently shown ids (no immediate
 * repetition). Falls back to the full pool when everything was recent.
 */
export function pickAvoiding<T extends Weighted & { id: string }>(
  items: readonly T[],
  recent: readonly string[],
  rand: () => number = Math.random,
): T | null {
  if (items.length === 0) return null;
  const window = Math.min(recent.length, Math.max(0, items.length - 1));
  const avoid = new Set(recent.slice(-window));
  const fresh = items.filter((i) => !avoid.has(i.id));
  return weightedPick(fresh.length ? fresh : items, rand);
}

/** Deterministic pseudo-random index for a given string seed (e.g. a date). */
export function seededIndex(seed: string, length: number) {
  if (length <= 0) return -1;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % length;
}

export function shuffle<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickOne<T>(arr: readonly T[], rand: () => number = Math.random): T | null {
  return arr.length ? arr[Math.floor(rand() * arr.length)] : null;
}

/** Small deterministic PRNG (mulberry32) seeded from a string. */
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random seed (called from server components / event handlers). */
export function newSeed() {
  return Math.random().toString(36).slice(2, 10);
}
