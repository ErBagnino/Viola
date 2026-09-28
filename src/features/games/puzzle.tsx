"use client";

import { useEffect, useState } from "react";
import { Eye, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { seededRandom, shuffle } from "@/utils/random";
import { cn } from "@/utils/cn";
import { brokenRef, focusPosition } from "@/components/ui/photo";

/** Tap two tiles to swap them until the photo is complete. */
const N = 3;

function scrambled(rand: () => number) {
  let t = shuffle(Array.from({ length: N * N }, (_, i) => i), rand);
  while (t.every((x, i) => x === i)) t = shuffle(t, rand);
  return t;
}

export function Puzzle({ imageUrl: photoUrl, seed, focus }: { imageUrl: string | null; seed: string; focus?: string | null }) {
  const n = N;
  // a photo that cannot be loaded falls back to the numbered gradient tiles
  const [broken, setBroken] = useState(false);
  const imageUrl = broken ? null : photoUrl;
  const [tiles, setTiles] = useState<number[]>(() => scrambled(seededRandom(seed)));
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [peek, setPeek] = useState(false);
  const solved = moves > 0 && tiles.every((t, i) => t === i);

  const scramble = () => {
    setTiles(scrambled(Math.random));
    setMoves(0);
    setSel(null);
  };
  useEffect(() => {
    if (solved) track("game_played", { game: "puzzle", moves });
  }, [solved, moves]);

  const tap = (i: number) => {
    if (solved) return;
    if (sel === null) return setSel(i);
    if (sel === i) return setSel(null);
    setTiles((t) => {
      const next = [...t];
      [next[sel], next[i]] = [next[i], next[sel]];
      return next;
    });
    setMoves((m) => m + 1);
    setSel(null);
  };

  const bg = "linear-gradient(135deg,#fbe1e1,#e3262b 55%,#621226)";

  return (
    <div>
      <HeartBurst show={solved} />
      <p className="text-sm text-ink-soft">Tocca due tessere per scambiarle.</p>
      <div className="mb-3 flex min-h-11 items-center justify-between gap-2 text-sm font-bold text-vio-700">
        <span>Mosse: {moves}</span>
        {imageUrl && !solved && (
          <button
            type="button"
            onPointerDown={() => setPeek(true)}
            onPointerUp={() => setPeek(false)}
            onPointerLeave={() => setPeek(false)}
            onClick={() => setPeek((v) => !v)}
            className="press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 hover:bg-tint-50"
            aria-pressed={peek}
          >
            <Eye className="size-4" /> Sbircia
          </button>
        )}
      </div>
      <div className="relative mx-auto max-w-sm">
      {peek && imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="La foto completa" className="absolute inset-0 z-10 aspect-square h-full w-full rounded-3xl object-cover shadow-soft" style={{ objectPosition: focusPosition(focus) }} />
      )}
      <div className="grid aspect-square gap-1 overflow-hidden rounded-3xl bg-surface p-1 shadow-soft" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {tiles.map((t, i) => {
          const col = t % n;
          const row = Math.floor(t / n);
          return (
            <button
              key={i}
              type="button"
              onClick={() => tap(i)}
              aria-label={`Tessera ${i + 1}${sel === i ? ", selezionata" : ""}`}
              aria-pressed={sel === i}
              className={cn("relative aspect-square overflow-hidden rounded-xl transition", sel === i && "ring-4 ring-wine-500", solved && "rounded-none")}
              style={imageUrl ? undefined : { backgroundImage: bg, backgroundSize: `${n * 100}% ${n * 100}%`, backgroundPosition: `${(col / (n - 1)) * 100}% ${(row / (n - 1)) * 100}%` }}
            >
              {imageUrl ? (
                // The whole photo, cropped to a centred square (object-cover: never stretched),
                // shifted so this tile shows its own n×n piece.
                <span className="pointer-events-none absolute" style={{ width: `${n * 100}%`, height: `${n * 100}%`, left: `${-col * 100}%`, top: `${-row * 100}%` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: focusPosition(focus) }} draggable={false} ref={brokenRef(() => setBroken(true))} onError={() => setBroken(true)} />
                </span>
              ) : (
                <span className="absolute inset-0 grid place-items-center text-xl font-extrabold text-white/80">{t + 1}</span>
              )}
            </button>
          );
        })}
      </div>
      </div>
      {solved && <p className="mt-4 text-center font-display text-2xl font-semibold text-vio-900">Completato! ♡</p>}
      <Button variant="soft" className="mt-5 w-full" onClick={scramble}>
        <Shuffle className="size-4" /> Mescola di nuovo
      </Button>
    </div>
  );
}
