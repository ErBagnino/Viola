"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Bot, Flower2, Heart, Home, LayoutDashboard, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { HeartFlower } from "@/components/decor/stars";
import { NeedAdamShortcut } from "@/components/layout/shell-context";
import { cn } from "@/utils/cn";

const NAV = [
  { href: "/viola", label: "Home", icon: Home, exact: true },
  { href: "/viola/calma", label: "Calma", icon: Flower2 },
  { href: "/viola/noi", label: "Noi", icon: Heart },
  { href: "/viola/ai", label: "AI", icon: Bot },
  { href: "/viola/altro", label: "Altro", icon: MoreHorizontal },
];

function isActive(path: string, href: string, exact?: boolean) {
  return exact ? path === href : path === href || path.startsWith(`${href}/`);
}

export function VioShell({ children, appName, isAdmin }: { children: ReactNode; appName: string; isAdmin: boolean }) {
  const path = usePathname();
  // Immersive pages hide the navigation.
  const immersive = /^\/viola\/(calma\/paura|abbraccio)/.test(path);

  return (
    <div className="relative min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 p-5 lg:flex">
        <Link href="/viola" className="mb-6 flex items-center gap-3 px-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-black">
            <HeartFlower className="size-8" color="#da0e14" strokeWidth={46} />
          </span>
          <span className="font-display text-2xl font-semibold text-wine-900">{appName}</span>
        </Link>
        {NAV.map((n) => {
          const active = isActive(path, n.href, n.exact);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "press flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition",
                active ? "bg-wine-700 text-white shadow-soft" : "text-wine-800 hover:bg-white/70",
              )}
              aria-current={active ? "page" : undefined}
            >
              <n.icon className="size-5" /> {n.label}
            </Link>
          );
        })}
        <div className="mt-auto space-y-2">
          <Link href="/viola/adam" className="press btn-3d flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-rouge-400 to-rouge-600 px-4 py-3 text-sm font-extrabold text-white">
            ♡ Ho bisogno di Adam
          </Link>
          {isAdmin && (
            <Link href="/admin" className="press flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-wine-700 hover:bg-white/70">
              <LayoutDashboard className="size-4" /> Torna all&apos;admin
            </Link>
          )}
        </div>
      </aside>

      <main className={cn("relative mx-auto w-full max-w-2xl px-4 pt-[max(env(safe-area-inset-top),1.25rem)] sm:px-6", immersive ? "pb-8" : "pb-32 lg:pb-12")}>
        {isAdmin && (
          <Link
            href="/admin"
            className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-lilac-100 px-3 py-1 text-xs font-bold text-lilac-600 lg:hidden"
          >
            <LayoutDashboard className="size-3.5" /> Anteprima di Viola · torna all&apos;admin
          </Link>
        )}
        <NeedAdamShortcut.Provider value="/viola/adam">{children}</NeedAdamShortcut.Provider>
      </main>

      {!immersive && (
        <nav
          aria-label="Navigazione principale"
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)] lg:hidden"
        >
          <div className="paper mx-auto flex max-w-md items-stretch justify-between rounded-[1.75rem] px-1.5 py-1.5">
            {NAV.map((n) => {
              const active = isActive(path, n.href, n.exact);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-extrabold"
                >
                  {active && (
                    <motion.span
                      layoutId="vio-nav-pill"
                      className="absolute inset-0 rounded-2xl bg-wine-700"
                      transition={{ type: "spring", damping: 26, stiffness: 340 }}
                    />
                  )}
                  <n.icon className={cn("relative size-[22px]", active ? "text-white" : "text-wine-700")} strokeWidth={2.2} />
                  <span className={cn("relative", active ? "text-white" : "text-wine-700")}>{n.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
