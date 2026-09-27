// Calm placeholder while a page loads: the shape of what is coming, no spinner.
export function PageSkeleton({ label = "Un attimo…" }: { label?: string }) {
  const bar = "rounded-2xl bg-tint-100 motion-safe:animate-pulse";
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="mb-6 flex items-start gap-3" aria-hidden>
        <div className="min-w-0 flex-1 space-y-2.5 pt-1">
          <div className={`${bar} h-8 w-3/5`} />
          <div className={`${bar} h-4 w-4/5`} />
        </div>
        <div className={`${bar} size-11`} />
      </div>
      <div className="grid grid-cols-2 gap-3" aria-hidden>
        <div className={`${bar} col-span-2 h-28 rounded-4xl`} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${bar} h-32 rounded-[1.75rem]`} style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    </div>
  );
}
