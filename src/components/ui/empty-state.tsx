import type { ReactNode } from "react";
import { Sparkle } from "@/components/decor/stars";
import { cn } from "@/utils/cn";

export function EmptyState({
  title,
  text,
  action,
  className,
  emoji = "♡",
}: {
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
  emoji?: string;
}) {
  return (
    <div className={cn("paper relative overflow-hidden rounded-4xl px-6 py-10 text-center", className)}>
      <Sparkle className="absolute top-4 right-6 size-5 animate-twinkle text-lilac-400" />
      <Sparkle className="absolute bottom-6 left-6 size-3.5 animate-twinkle text-peach-400 [animation-delay:600ms]" />
      <div className="mx-auto mb-3 grid size-16 place-items-center rounded-3xl bg-blush-100 text-3xl text-vio-500">{emoji}</div>
      <h2 className="text-xl font-semibold text-vio-900">{title}</h2>
      {text && <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-soft">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
