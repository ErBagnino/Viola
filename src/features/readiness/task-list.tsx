"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { callAction } from "@/utils/call-action";
import { haptic } from "@/utils/haptics";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/dates";
import { setReadinessCheck } from "./actions";
import type { TaskResult } from "./types";

function useMark() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const mark = (task: TaskResult, state: "done" | "skipped" | null) =>
    start(async () => {
      const res = await callAction(() => setReadinessCheck(task.id, state));
      if (!res.ok) return toast.show(res.error, "error");
      if (state === "done") haptic("success");
      toast.show(state === "done" ? "Fatto ♡" : state === "skipped" ? "Ok, lo tolgo dalla lista" : "Rimesso tra le cose da fare");
      router.refresh();
    });
  return { pending, mark };
}

/** One checklist item: what, why, where to do it, and (if manual) "Fatto". */
export function TaskRow({ task }: { task: TaskResult }) {
  const { pending, mark } = useMark();
  const pct = task.progress ? Math.round((task.progress.value / task.progress.target) * 100) : null;
  return (
    <li className={cn("rounded-3xl bg-surface p-4 ring-1 ring-line", pending && "opacity-60")} id={`task-${task.id}`}>
      <div className="flex items-start gap-3">
        <Circle className="mt-0.5 size-5 shrink-0 text-tint-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-bold text-vio-900">{task.title}</p>
          <p className="mt-0.5 text-sm leading-snug text-ink-soft">{task.description}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-ink-muted">
            {pct !== null && (
              <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-tint-100" aria-hidden>
                <span className="block h-full rounded-full bg-wine-500" style={{ width: `${pct}%` }} />
              </span>
            )}
            <span>
              {task.category}
              {task.detail ? ` · ${task.detail}` : ""}
              {task.manual ? " · da spuntare tu" : ""}
            </span>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Link href={task.href} className="press inline-flex h-10 items-center gap-1.5 rounded-xl bg-wine-700 px-3.5 text-sm font-extrabold text-white">
              {task.cta} →
            </Link>
            {task.manual && (
              <Button size="sm" variant="soft" disabled={pending} onClick={() => mark(task, "done")}>
                <Check className="size-4" /> Fatto
              </Button>
            )}
            {task.skippable && (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => mark(task, "skipped")}>
                Non mi serve
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/** A completed item; manual ticks and "Non mi serve" can be undone. */
export function DoneRow({ task, tz }: { task: TaskResult; tz: string }) {
  const { pending, mark } = useMark();
  const undoable = task.skipped || (task.manual && task.doneAt);
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl px-3 py-2", pending && "opacity-60")}>
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-white", task.skipped ? "bg-tint-300" : "bg-emerald-500")} aria-hidden>
        <Check className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-bold", task.skipped ? "text-ink-muted line-through" : "text-vio-900")}>{task.title}</span>
        <span className="block text-xs text-ink-muted">
          {task.skipped ? "Non ti serve" : task.detail || "Fatto"}
          {task.doneAt ? ` · ${formatDate(task.doneAt, { day: "numeric", month: "short" }, tz)}` : ""}
        </span>
      </span>
      {undoable && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => mark(task, null)} aria-label={`Rimetti da fare: ${task.title}`}>
          <RotateCcw className="size-4" />
        </Button>
      )}
    </li>
  );
}
