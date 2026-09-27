import { HeartFlower } from "@/components/decor/stars";

export function LoadingHeart({ label = "Un attimo…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <HeartFlower className="size-14 animate-heartbeat text-wine-400" />
      <p className="text-sm font-bold text-ink-muted">{label}</p>
    </div>
  );
}
