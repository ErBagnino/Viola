"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { callAction } from "@/utils/call-action";
import { deleteMood } from "./actions";

export function MoodHistoryDelete({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await callAction(() => deleteMood(id));
          if (!res.ok) toast.show(res.error, "error");
        })
      }
      className="press grid size-11 place-items-center rounded-xl text-ink-muted hover:bg-tint-50 disabled:opacity-40"
      aria-label="Elimina"
    >
      <X className="size-4" />
    </button>
  );
}
