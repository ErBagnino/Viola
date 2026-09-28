"use client";

import { useState } from "react";
import { CheckCircle2, Stethoscope, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { GeminiCheck } from "@/server/ai/diagnose";

/**
 * "Prova Gemini": asks the server to test the real key with the smallest
 * request and shows exactly what Google answered (the key is never shown).
 */
export function ModelChecker() {
  const [check, setCheck] = useState<GeminiCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/diagnose", { method: "POST" });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "La prova non è partita.");
      else setCheck(json as GeminiCheck);
    } catch {
      setError(navigator.onLine === false ? "Sei offline: ricollegati e riprova." : "La prova non è arrivata al server. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button variant="soft" size="sm" loading={busy} onClick={run}>
        <Stethoscope className="size-4" /> Prova Gemini
      </Button>
      <p className="mt-1.5 text-xs text-ink-muted">Controlla la chiave vera del server con una richiesta minima e ti dice esattamente cosa risponde Google.</p>
      {error && (
        <p className="mt-2 text-sm font-bold text-rouge-600" role="alert">
          {error}
        </p>
      )}
      {check && (
        <div className="mt-3 space-y-3" role="status" aria-live="polite">
          <div className={cn("flex items-start gap-2 rounded-2xl p-3", check.verdict.ok ? "bg-green-100 text-green-900" : "bg-blush-100 text-vio-900")}>
            {check.verdict.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-rouge-600" />}
            <div>
              <p className="font-extrabold">{check.verdict.title}</p>
              <p className="text-sm">{check.verdict.text}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="font-bold text-ink-soft">Chiave</dt>
            <dd className="min-w-0 text-vio-900">
              {check.key.present ? (
                <>
                  <code className="rounded bg-surface px-1.5">{check.key.masked}</code> · {check.key.length} caratteri
                  {!check.key.looksLikeAiStudio && <span className="block text-xs text-ink-soft">Non ha la forma di una chiave di Google AI Studio (AIza… 39 caratteri): controlla di aver copiato la chiave giusta.</span>}
                  {check.key.cleaned && <span className="block text-xs text-ink-soft">Aveva spazi o virgolette intorno: li ignoro, ma è meglio correggerla su Vercel.</span>}
                </>
              ) : (
                "mancante"
              )}
            </dd>
            {check.envModel && (
              <>
                <dt className="font-bold text-ink-soft">GEMINI_MODEL</dt>
                <dd className="text-vio-900">
                  <code>{check.envModel}</code>
                </dd>
              </>
            )}
            {check.baseUrlOverride && (
              <>
                <dt className="font-bold text-rouge-600">GEMINI_BASE_URL</dt>
                <dd className="text-rouge-600">è impostata: serve solo ai test automatici, toglila da Vercel.</dd>
              </>
            )}
            <dt className="font-bold text-ink-soft">Modelli</dt>
            <dd className="min-w-0 text-vio-900">
              {check.list.ok ? (
                <>
                  {check.list.models!.length} disponibili per questa chiave
                  {check.list.missing!.length > 0 && <span className="block text-xs text-ink-soft">Non esistono per questa chiave (vengono saltati): {check.list.missing!.join(", ")}</span>}
                </>
              ) : (
                <span>
                  lista non letta ({check.list.status ?? check.list.code}
                  {check.list.reason ? ` ${check.list.reason}` : ""})
                </span>
              )}
            </dd>
          </dl>
          {check.probes.length > 0 && (
            <ul className="space-y-1 text-sm" aria-label="Prove sui modelli">
              {check.probes.map((p) => (
                <li key={p.model} className="rounded-xl bg-surface px-3 py-2">
                  <span className="font-bold text-vio-900">{p.ok ? "✓" : "✗"} {p.model}</span>{" "}
                  <span className="text-ink-soft">
                    {p.ok ? `«${p.answer}» · ${p.ms} ms` : `${p.status ?? ""} ${p.reason ?? p.code ?? ""} · ${p.detail ?? ""}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-muted">Con una chiave gratuita di Google AI Studio ogni modello &quot;flash&quot;, &quot;flash-lite&quot; e &quot;gemma&quot; ha la sua quota gratuita giornaliera. Quando uno finisce, Adam AI passa da solo al successivo e lo riprova dopo il reset (verso le 9 del mattino in Italia). L&apos;app non usa mai servizi a pagamento in automatico.</p>
    </div>
  );
}
