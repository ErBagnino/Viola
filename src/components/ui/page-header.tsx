"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, HeartHandshake } from "lucide-react";
import { useNeedAdamShortcut } from "@/components/layout/shell-context";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function PageHeader({
  title,
  subtitle,
  back,
  right,
  className,
  tone = "light",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string | true;
  right?: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const path = usePathname();
  const needAdam = useNeedAdamShortcut();
  const showNeedAdam = Boolean(needAdam) && path !== needAdam;
  const backCls = cn(
    "press grid size-11 shrink-0 place-items-center rounded-2xl",
    tone === "dark" ? "bg-white/10 text-moon hover:bg-white/15" : "paper text-vio-700",
  );
  return (
    <header className={cn("mb-5 flex items-start gap-3", className)}>
      {back &&
        (back === true ? (
          <button type="button" onClick={() => router.back()} className={backCls} aria-label="Indietro">
            <ChevronLeft className="size-6" />
          </button>
        ) : (
          <Link href={back} className={backCls} aria-label="Indietro">
            <ChevronLeft className="size-6" />
          </Link>
        ))}
      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className={cn("text-[1.75rem] leading-tight font-semibold text-balance", tone === "dark" ? "text-moon" : "text-vio-900")}>
          {title}
        </h1>
        {subtitle && (
          <p className={cn("mt-1 text-[15px]", tone === "dark" ? "text-moon/70" : "text-ink-soft")}>{subtitle}</p>
        )}
      </div>
      {right}
      {showNeedAdam && (
        <Link
          href={needAdam!}
          className={cn(
            "press grid size-11 shrink-0 place-items-center rounded-2xl",
            tone === "dark" ? "bg-white/10 text-rouge-400 hover:bg-white/15" : "paper text-rouge-500",
          )}
          aria-label="Ho bisogno di Adam"
          title="Ho bisogno di Adam"
        >
          <HeartHandshake className="size-6" />
        </Link>
      )}
    </header>
  );
}
