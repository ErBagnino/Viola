import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { isDarkTone, toneClass } from "@/components/ui/card";
import { Sparkle } from "@/components/decor/stars";
import { cn } from "@/utils/cn";

export function ActionCard({
  href,
  title,
  subtitle,
  icon,
  color,
  wide,
  index = 0,
}: {
  href: string;
  title: string;
  subtitle?: string | null;
  icon?: string | null;
  color?: string | null;
  wide?: boolean;
  index?: number;
}) {
  const dark = isDarkTone(color);
  const external = /^(https?:|tel:)/.test(href);
  const content = (
    <>
      <Sparkle className={cn("absolute top-3 right-3 size-3 animate-twinkle", dark ? "text-white/50" : "text-white")} />
      <span
        className={cn(
          "mb-3 grid size-11 place-items-center rounded-2xl",
          dark ? "bg-white/15 text-white" : "bg-white/80 text-wine-600 shadow-sm",
        )}
      >
        <Icon name={icon ?? "heart"} className="size-[22px] text-[22px]" />
      </span>
      <span className="block text-[15px] leading-snug font-extrabold text-balance">{title}</span>
      {subtitle && <span className={cn("mt-1 block text-xs leading-snug", dark ? "text-white/75" : "text-ink-soft")}>{subtitle}</span>}
    </>
  );
  const cls = cn(
    "press relative block overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-float",
    toneClass(color),
    wide && "col-span-2",
  );
  const style = { animationDelay: `${index * 40}ms` };
  return external ? (
    <a href={href} className={cls} style={style} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href} className={cls} style={style}>
      {content}
    </Link>
  );
}
