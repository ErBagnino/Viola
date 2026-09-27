"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeartBurst } from "@/components/decor/burst";
import { Icon } from "@/components/ui/icon";

/**
 * "Momenti speciali": on the day of a birthday, anniversary or meeting set
 * by Adam as a countdown, the home opens with this card. The little heart
 * celebration plays once per day per device.
 */
export function SpecialDay({ id, title, text, icon, day }: { id: string; title: string; text: string; icon: string | null; day: string }) {
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    const key = `vio:special:${id}:${day}`;
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
      localStorage.setItem(key, "1");
    } catch {
      /* private mode: celebrate anyway */
    }
    if (seen) return;
    const show = setTimeout(() => setBurst(true), 350);
    const hide = setTimeout(() => setBurst(false), 1800);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [id, day]);

  return (
    <>
      <HeartBurst show={burst} />
      <Link href="/viola/noi/countdown" className="press btn-3d relative block overflow-hidden rounded-4xl bg-gradient-to-br from-rouge-400 via-rouge-500 to-wine-700 p-5 text-white">
        <span className="absolute -top-8 -right-8 size-36 rounded-full bg-white/10" aria-hidden />
        <p className="flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase opacity-90">
          <Icon name={icon ?? "calendar-heart"} className="size-4 text-base" /> Oggi
        </p>
        <p className="mt-1 font-display text-[1.7rem] leading-tight font-semibold">{title}</p>
        <p className="mt-1 font-hand text-2xl">{text}</p>
      </Link>
    </>
  );
}
