"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="paper mx-auto mt-10 max-w-md rounded-4xl p-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-wine-900">Questa sezione non si è caricata.</h1>
      <p className="mt-2 text-ink-soft">Può essere la connessione o il database in pausa. Riprova tra un attimo: i tuoi dati sono al sicuro.</p>
      {error.digest && <p className="mt-2 text-xs text-ink-muted">Codice: {error.digest}</p>}
      <Button className="mt-5" onClick={reset}>
        Riprova
      </Button>
    </div>
  );
}
