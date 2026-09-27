"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartFlower } from "@/components/decor/stars";
import { EmergencyContact } from "@/features/offline/emergency-contact";

// Errors inside Viola's area keep the navigation and always leave a way out:
// try again, breathe (works offline), or reach Adam directly.
export default function ViolaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <HeartFlower className="size-16 text-vio-500" />
      <h1 className="mt-5 font-display text-[1.75rem] leading-tight font-semibold text-vio-900">Questa pagina non si è aperta.</h1>
      <p className="mt-2 text-ink-soft">Non è colpa tua. Riproviamo, oppure fai una di queste cose.</p>
      <div className="mt-6 grid w-full max-w-sm gap-2">
        <Button size="lg" onClick={reset}>
          Riprova
        </Button>
        <Link href="/offline" className="press paper flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-bold text-vio-800">
          <Wind className="size-5" /> Respira con me
        </Link>
        <EmergencyContact />
      </div>
    </div>
  );
}
