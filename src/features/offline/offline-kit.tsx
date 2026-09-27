"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wind, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/fields";
import { BreathingSession } from "@/features/breathing/breathing-session";
import type { BreathingPresetView } from "@/features/breathing/types";
import { GroundingFlow } from "@/features/grounding/grounding-flow";
import { DEFAULT_54321, DEFAULT_FEET } from "@/features/grounding/types";
import { pickOne } from "@/utils/random";

const PRESET: BreathingPresetView = {
  id: "offline",
  name: "Respiro calmo",
  description: null,
  inhale: 4,
  hold: 4,
  exhale: 6,
  holdAfter: 0,
  rounds: 8,
  visual: "heart",
  showPhotos: false,
  photoMode: "none",
  texts: ["Respira con me.", "Un respiro alla volta.", "Eccomi."],
  audioUrl: null,
};

const COMFORT = [
  "Appoggia i piedi a terra e senti il pavimento.",
  "Bevi lentamente un bicchiere d'acqua.",
  "Lavati il viso con acqua fresca.",
  "Abbraccia un cuscino per venti secondi.",
  "Apri la finestra e fai tre respiri lenti.",
  "Trova 5 cose blu intorno a te.",
  "Stringi forte i pugni per 5 secondi, poi lascia andare.",
  "Metti una mano sul petto e senti il tuo respiro.",
];

/** Everything that must work without internet: breathing, grounding, 5-4-3-2-1, comfort ideas. */
export function OfflineKit() {
  const [tab, setTab] = useState<"respira" | "54321" | "grounding" | "idee">("respira");
  const [breathing, setBreathing] = useState(false);
  const [idea, setIdea] = useState(COMFORT[0]);
  // We are here because a page could not load: assume the app is unreachable
  // until the server actually answers (the phone may be "online" while the
  // server, or the connection quality, is not).
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch(`/manifest.webmanifest?ping=${Date.now()}`, { cache: "no-store" });
        if (alive) setOnline(r.ok);
      } catch {
        if (alive) setOnline(false);
      }
    };
    check();
    const t = setInterval(check, 8000);
    window.addEventListener("online", check);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("online", check);
    };
  }, []);

  return (
    <main className="mx-auto max-w-xl px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-10">
      <div className="paper mb-5 flex items-center gap-3 rounded-3xl p-4">
        <WifiOff className="size-6 shrink-0 text-wine-500" />
        <div>
          <p className="font-bold text-wine-900">{online ? "La connessione è tornata ♡" : "Sei offline, ma io sono qui."}</p>
          <p className="text-sm text-ink-soft">{online ? "Puoi tornare all'app." : "Queste cose funzionano anche senza internet."}</p>
        </div>
        {online && (
          <Link href="/viola" className="ml-auto rounded-full bg-wine-700 px-4 py-2 text-sm font-bold text-white">
            Entra
          </Link>
        )}
      </div>
      <Segmented
        label="Scegli"
        value={tab}
        onChange={setTab}
        options={[
          { value: "respira", label: "Respira" },
          { value: "54321", label: "5-4-3-2-1" },
          { value: "grounding", label: "Piedi a terra" },
          { value: "idee", label: "Idee" },
        ]}
      />
      <div className="mt-5">
        {tab === "respira" && (
          <div className="paper rounded-4xl p-6 text-center">
            <p className="font-display text-2xl text-wine-900">Respira con me.</p>
            <p className="mt-1 text-ink-soft">Inspira 4 · trattieni 4 · espira 6</p>
            <Button size="xl" className="mt-5 w-full" onClick={() => setBreathing(true)}>
              <Wind className="size-5" /> Inizia
            </Button>
          </div>
        )}
        {tab === "54321" && <GroundingFlow exercise={DEFAULT_54321} onDone={() => setTab("respira")} />}
        {tab === "grounding" && <GroundingFlow exercise={DEFAULT_FEET} onDone={() => setTab("respira")} />}
        {tab === "idee" && (
          <div className="paper rounded-4xl p-6">
            <p className="font-display text-2xl leading-snug text-wine-900">{idea}</p>
            <Button variant="soft" className="mt-5 w-full" onClick={() => setIdea(pickOne(COMFORT.filter((c) => c !== idea)) ?? COMFORT[0])}>
              Un&apos;altra idea
            </Button>
          </div>
        )}
      </div>
      <p className="mt-8 text-center text-xs text-ink-muted">Se sei in pericolo chiama il 112. Appena torna la rete, puoi premere &quot;Ho bisogno di Adam&quot;.</p>
      {breathing && <BreathingSession preset={PRESET} photos={[]} phrases={PRESET.texts} endText="Brava. Un passo alla volta. ♡" onClose={() => setBreathing(false)} />}
    </main>
  );
}
