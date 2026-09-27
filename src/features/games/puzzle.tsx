"use client";

import { useEffect, useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartBurst } from "@/components/decor/burst";
import { track } from "@/features/activity/track";
import { seededRandom, shuffle } from "@/utils/random";
import { cn } from "@/utils/cn";

/** Tap two tiles to swap them until the photo is complete. */
const N = 3;

function scrambled(rand: () => number) {
  let t = shuffle(Array.from({ length: N * N }, (_, i) => i), rand);
  while (t.every((x, i) => x === i)) t = shuffle(t, rand);
  return t;
}

export function Puzzle({ imageUrl, seed }: { imageUrl: string | null; seed: string }) {
  const n = N;
  const [tiles, setTiles] = useState<number[]>(() => scrambled(seededRandom(seed)));
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
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

  const bg = imageUrl ? `url(${JSON.stringify(imageUrl)})` : "linear-gradient(135deg,#f8d3d0,#cbb8e8 50%,#f7bb93)";

  return (
    <div>
      <HeartBurst show={solved} />
      <p className="mb-3 text-sm font-bold text-wine-700">Tocca due tessere per scambiarle · Mosse: {moves}</p>
      <div className="mx-auto grid aspect-square max-w-sm gap-1 overflow-hidden rounded-3xl bg-white p-1 shadow-soft" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {tiles.map((t, i) => {
          const x = (t % n) * 50;
          const y = Math.floor(t / n) * 50;
          return (
            <button
              key={i}
              type="button"
              onClick={() => tap(i)}
              aria-label={`Tessera ${i + 1}`}
              className={cn("relative aspect-square rounded-xl transition", sel === i && "ring-4 ring-wine-500", solved && "rounded-none")}
              style={{ backgroundImage: bg, backgroundSize: `${n * 100}% ${n * 100}%`, backgroundPosition: `${x}% ${y}%` }}
            >
              {!imageUrl && <span className="absolute inset-0 grid place-items-center text-xl font-extrabold text-white/80">{t + 1}</span>}
            </button>
          );
        })}
      </div>
      {solved && <p className="mt-4 text-center font-display text-2xl font-semibold text-wine-900">Completato! ♡</p>}
      <Button variant="soft" className="mt-5 w-full" onClick={scramble}>
        <Shuffle className="size-4" /> Mescola di nuovo
      </Button>
    </div>
  );
}
