"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { deleteMyData } from "./actions";
import { callAction } from "@/utils/call-action";

const OPTIONS = [
  { key: "moods", label: "Il mio umore" },
  { key: "journal", label: "Il mio diario" },
  { key: "messages", label: "I messaggi che ho scritto" },
  { key: "aiChats", label: "Le chat con Adam AI" },
  { key: "activity", label: "Statistiche d'uso (es. respiri fatti)" },
] as const;

export function PrivacyPanel() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const any = Object.values(sel).some(Boolean);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" /> Cancella i miei dati
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Cancella i miei dati">
        <p className="text-sm text-ink-soft">Scegli cosa vuoi cancellare per sempre. Non si può annullare.</p>
        <div className="mt-4 space-y-2">
          {OPTIONS.map((o) => (
            <label key={o.key} className="flex items-center gap-3 rounded-2xl bg-surface/80 px-4 py-3 font-bold text-vio-900">
              <input type="checkbox" className="size-5 accent-wine-600" checked={Boolean(sel[o.key])} onChange={(e) => setSel((s) => ({ ...s, [o.key]: e.target.checked }))} />
              {o.label}
            </label>
          ))}
        </div>
        <Button
          variant="danger"
          size="lg"
          className="mt-5 w-full"
          disabled={!any}
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await callAction(() => deleteMyData({
                moods: Boolean(sel.moods),
                journal: Boolean(sel.journal),
                messages: Boolean(sel.messages),
                activity: Boolean(sel.activity),
                aiChats: Boolean(sel.aiChats),
              }));
              if (res.ok) {
                toast.show("Fatto. Cancellato ♡");
                setOpen(false);
                setSel({});
              } else toast.show(res.error, "error");
            })
          }
        >
          Cancella per sempre
        </Button>
      </Sheet>
    </>
  );
}
