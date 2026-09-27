"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteMood } from "./actions";

export function MoodHistoryDelete({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await deleteMood(id)))}
      className="press grid size-9 place-items-center rounded-xl text-ink-muted hover:bg-wine-50 disabled:opacity-40"
      aria-label="Elimina"
    >
      <X className="size-4" />
    </button>
  );
}
