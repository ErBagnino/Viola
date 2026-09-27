"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Eye, Menu } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { HeartFlower } from "@/components/decor/stars";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { ADMIN_MOBILE_TABS, ADMIN_NAV } from "@/features/admin/nav";
import { cn } from "@/utils/cn";

function active(path: string, href: string) {
  return href === "/admin" ? path === href : path === href || path.startsWith(`${href}/`);
}

function NavList({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  const groups = Array.from(new Set(ADMIN_NAV.map((n) => n.group)));
  return (
    <nav aria-label="Sezioni admin" className="space-y-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1.5 px-3 text-[11px] font-extrabold tracking-widest text-wine-400 uppercase">{g}</p>
          <ul className="space-y-0.5">
            {ADMIN_NAV.filter((n) => n.group === g).map((n) => {
              const on = active(path, n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition", on ? "bg-wine-700 text-white shadow-soft" : "text-vio-800 hover:bg-surface/70")}
                  >
                    <Icon name={n.icon} className="size-[18px]" /> {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children, appName, pendingRequests }: { children: ReactNode; appName: string; pendingRequests: number }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col overflow-y-auto p-5 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-3 px-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-black">
            <HeartFlower className="size-8" color="#da0e14" strokeWidth={46} />
          </span>
          <span>
            <span className="block font-display text-xl font-semibold text-vio-900">{appName}</span>
            <span className="block text-xs font-bold text-vio-500">Pannello di Adam</span>
          </span>
        </Link>
        <NavList path={path} />
        <div className="mt-6 space-y-2 border-t border-blush-200 pt-4">
          <Link href="/viola" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-vio-700 hover:bg-surface/70">
            <Eye className="size-4" /> Guarda l&apos;app come Viola
          </Link>
          <SignOutButton className="w-full" />
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-32 sm:px-6 lg:pb-12">{children}</main>

      <nav aria-label="Navigazione admin" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)] lg:hidden">
        <div className="paper mx-auto flex max-w-md items-stretch rounded-[1.75rem] p-1.5">
          {ADMIN_MOBILE_TABS.map((href) => {
            const n = ADMIN_NAV.find((x) => x.href === href)!;
            const on = active(path, href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10.5px] font-extrabold", on ? "bg-wine-700 text-white" : "text-vio-700")}>
                <Icon name={n.icon} className="size-[21px]" />
                <span className="max-w-full truncate px-1">{href === "/admin/richieste" ? "Richieste" : n.label}</span>
                {href === "/admin/richieste" && pendingRequests > 0 && (
                  <span className="absolute top-1 right-3 grid min-w-5 place-items-center rounded-full bg-rouge-500 px-1 text-[10px] text-white">{pendingRequests}</span>
                )}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMenu(true)} className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10.5px] font-extrabold text-vio-700" aria-label="Tutte le sezioni">
            <Menu className="size-[21px]" /> Menu
          </button>
        </div>
      </nav>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Tutte le sezioni">
        <NavList path={path} onNavigate={() => setMenu(false)} />
        <div className="mt-6 flex flex-wrap gap-2 border-t border-blush-200 pt-4">
          <Link href="/viola" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-2.5 text-sm font-bold text-vio-700">
            <Eye className="size-4" /> Guarda come Viola
          </Link>
          <SignOutButton />
        </div>
      </Sheet>
    </div>
  );
}
