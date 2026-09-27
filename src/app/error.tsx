"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { HeartFlower } from "@/components/decor/stars";
import { EmergencyContact } from "@/features/offline/emergency-contact";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <HeartFlower className="size-20 animate-heartbeat text-vio-500" />
      <h1 className="mt-6 font-display text-3xl font-semibold text-vio-900">Ops, qualcosa si è inceppato.</h1>
      <p className="mt-2 text-lg text-ink-soft">Riproviamo. ♡</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Riprova</Button>
        <Link href="/" className="press rounded-2xl px-5 py-3 font-bold text-vio-700">
          Torna a casa
        </Link>
      </div>
      <Link href="/offline" className="mt-8 text-sm font-bold text-vio-500 underline underline-offset-4">
        Intanto puoi respirare con me
      </Link>
      <EmergencyContact className="mt-6 w-full max-w-sm" />
    </main>
  );
}
