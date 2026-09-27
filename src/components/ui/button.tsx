"use client";

import Link from "next/link";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "love" | "soft" | "ghost" | "outline" | "night" | "white" | "danger";
type Size = "sm" | "md" | "lg" | "xl" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "btn-3d text-white bg-gradient-to-b from-wine-500 to-wine-700 hover:from-wine-500 hover:to-wine-600 disabled:from-wine-300 disabled:to-wine-400",
  love: "btn-3d text-white bg-gradient-to-b from-rouge-400 to-rouge-600 disabled:opacity-60",
  soft: "press text-wine-800 bg-blush-100 hover:bg-blush-200 border border-blush-200",
  ghost: "press text-wine-700 hover:bg-wine-50",
  outline: "press text-wine-700 border-2 border-wine-200 bg-white/60 hover:bg-white",
  night: "press text-moon bg-night-700/80 hover:bg-night-700 border border-white/10",
  white: "btn-3d text-wine-800 bg-white hover:bg-cream-50",
  danger: "press text-white bg-rouge-600 hover:bg-rouge-500",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-2xl gap-2",
  lg: "h-14 px-6 text-base rounded-[1.25rem] gap-2.5",
  xl: "min-h-16 px-7 py-4 text-lg rounded-3xl gap-3",
  icon: "size-11 rounded-2xl",
};

type Common = { variant?: Variant; size?: Size; className?: string; children?: ReactNode; loading?: boolean };

export function buttonClass({ variant = "primary", size = "md", className }: Common = {}) {
  return cn(
    "inline-flex select-none items-center justify-center font-bold tracking-[0.01em] whitespace-nowrap",
    "disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-offset-4",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, Common & ComponentProps<"button">>(function Button(
  { variant, size, className, children, loading, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Dots /> : children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  external,
  ...rest
}: Common & { href: string; external?: boolean } & Omit<ComponentProps<"a">, "href">) {
  const cls = buttonClass({ variant, size, className });
  if (external || /^(https?:|tel:|mailto:|sms:)/.test(href)) {
    return (
      <a href={href} className={cls} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Caricamento">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-current"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}
