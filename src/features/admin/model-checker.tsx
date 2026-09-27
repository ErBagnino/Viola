"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ModelChecker() {
  const [models, setModels] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <Button
        variant="soft"
        size="sm"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await fetch("/api/admin/ai/models").then((x) => x.json()).catch(() => ({ error: "Errore di rete" }));
          setBusy(false);
          if (r.error) setError(r.error);
          else setModels(r.models);
        }}
      >
        <Search className="size-4" /> Quali modelli posso usare?
      </Button>
      {error && <p className="mt-2 text-sm font-bold text-rouge-600">{error}</p>}
      {models && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {models.map((m) => (
            <code key={m} className="rounded-lg bg-surface px-2 py-1 text-xs text-vio-800">
              {m}
            </code>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-ink-muted">Con una chiave gratuita di Google AI Studio i modelli &quot;flash&quot; e &quot;flash-lite&quot; sono gratuiti entro i limiti giornalieri. L&apos;app non usa mai servizi a pagamento in automatico.</p>
    </div>
  );
}
