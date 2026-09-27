"use client";

import { useState } from "react";
import { Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BreathingSession } from "@/features/breathing/breathing-session";
import type { BreathingPhoto, BreathingPresetView } from "@/features/breathing/types";

export function NightBreathing({ preset, photos, endText }: { preset: BreathingPresetView; photos: BreathingPhoto[]; endText: string }) {
  const [on, setOn] = useState(false);
  return (
    <>
      <Button variant="night" size="lg" className="w-full" onClick={() => setOn(true)}>
        <Wind className="size-5" /> Respira con me prima di dormire
      </Button>
      {on && <BreathingSession preset={preset} photos={photos} phrases={preset.texts} endText={endText} onClose={() => setOn(false)} tone="night" />}
    </>
  );
}
