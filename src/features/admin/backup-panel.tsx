"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { exportAction, importAction } from "./backup-actions";

export function BackupPanel() {
  const [withSettings, setWithSettings] = useState(true);
  const [report, setReport] = useState<Record<string, { ok: number; skipped: number }> | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const download = () =>
    start(async () => {
      const r = await exportAction(withSettings);
      if (!r.ok) return toast.show(r.error, "error");
      const blob = new Blob([JSON.stringify(r.backup, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `vio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.show("Backup scaricato ♡");
    });

  const upload = (f: File) =>
    start(async () => {
      if (f.size > 5 * 1024 * 1024) return toast.show("File troppo grande (max 5 MB).", "error");
      let json: unknown;
      try {
        json = JSON.parse(await f.text());
      } catch {
        return toast.show("Il file non è un JSON valido.", "error");
      }
      if (!confirm("Importare questo backup? Gli elementi con lo stesso ID verranno sovrascritti.")) return;
      const r = await importAction(json, withSettings);
      if (!r.ok) return toast.show(r.error, "error");
      setReport(r.report);
      toast.show("Import completato ♡");
    });

  return (
    <div className="space-y-4">
      <section className="paper rounded-4xl p-5">
        <Switch label="Includi le impostazioni (testi, AI, contatti)" description="I segreti (chiavi API, token) non sono mai nel backup: vivono solo nelle variabili d'ambiente." checked={withSettings} onChange={setWithSettings} />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={download} loading={pending}>
            <Download className="size-4" /> Export JSON
          </Button>
          <Button variant="soft" onClick={() => file.current?.click()} loading={pending}>
            <Upload className="size-4" /> Import JSON
          </Button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-3 text-xs text-ink-muted">Contiene: dediche, ricordi, comfort, countdown, open when, capsule, sorprese, frasi, respirazione, grounding, home, quiz, memoria AI e (se scelto) impostazioni. Le foto non sono incluse: scaricale da Supabase → Storage se vuoi una copia.</p>
      </section>
      {report && (
        <section className="paper rounded-4xl p-5">
          <h2 className="font-display text-lg font-semibold text-vio-900">Risultato import</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(report).map(([k, v]) => (
              <li key={k}>
                <b>{k}</b>: {v.ok} importati{v.skipped ? `, ${v.skipped} saltati (non validi)` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
