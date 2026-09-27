"use client";

import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/utils/cn";

const control =
  "w-full rounded-2xl border border-blush-200 bg-white/80 px-4 text-ink placeholder:text-ink-muted/70 shadow-[inset_0_1px_2px_rgb(82_18_38/0.05)] transition focus:border-wine-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blush-200/70 disabled:opacity-60";

export function Label({ children, hint, htmlFor, className }: { children: ReactNode; hint?: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 flex items-baseline justify-between gap-2 text-sm font-bold text-wine-800", className)}>
      <span>{children}</span>
      {hint && <span className="text-xs font-medium text-ink-muted">{hint}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(control, "h-12", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea(
  { className, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(control, "py-3 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select({ className, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        control,
        "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2382203d%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-10",
        className,
      )}
      {...rest}
    />
  );
});

export function Field({
  label,
  hint,
  error,
  children,
  className,
  id,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string) => ReactNode;
  className?: string;
  id?: string;
}) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fid} hint={hint}>
          {label}
        </Label>
      )}
      {children(fid)}
      {error && (
        <p className="mt-1.5 text-sm font-semibold text-rouge-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-bold text-wine-800">
          {label}
        </label>
        {description && <p className="text-xs text-ink-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="grid h-11 w-16 shrink-0 place-items-center disabled:opacity-50"
      >
        <span className={cn("relative h-8 w-14 rounded-full transition-colors", checked ? "bg-wine-600" : "bg-wine-100")}>
          <span
            className={cn(
              "absolute top-1 size-6 rounded-full bg-white shadow transition-all duration-200",
              checked ? "left-7" : "left-1",
            )}
          />
        </span>
      </button>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-1 rounded-2xl bg-wine-50 p-1", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "press flex-1 rounded-xl px-3 py-2 text-sm font-bold transition",
            value === o.value ? "bg-white text-wine-800 shadow-soft" : "text-wine-600 hover:bg-white/50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  active,
  children,
  className,
  ...rest
}: { active?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition",
        active ? "border-wine-600 bg-wine-600 text-white" : "border-blush-200 bg-white/70 text-wine-700 hover:bg-white",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
