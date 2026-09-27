import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export function AdminHeader({ title, description, icon, right, as: Heading = "h1" }: { title: string; description?: string; icon?: string; right?: ReactNode; as?: "h1" | "h2" }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-wine-600 shadow-soft">
            <Icon name={icon} className="size-6 text-2xl" />
          </span>
        )}
        <div className="min-w-0">
          <Heading className="text-[1.7rem] leading-tight font-semibold text-wine-900">{title}</Heading>
          {description && <p className="mt-0.5 max-w-2xl text-[15px] text-ink-soft">{description}</p>}
        </div>
      </div>
      {right}
    </header>
  );
}
