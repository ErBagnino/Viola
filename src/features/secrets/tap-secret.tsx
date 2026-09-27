"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { HeartBurst } from "@/components/decor/burst";
import { haptic } from "@/utils/haptics";

/**
 * Easter egg: tapping the wrapped element `taps` times in a row (quickly)
 * reveals a little secret. Invisible otherwise, never in the way.
 */
export function TapSecret({ taps = 7, message, children }: { taps?: number; message: string; children: ReactNode }) {
  const count = useRef(0);
  const last = useRef(0);
  const [open, setOpen] = useState(false);

  const tap = () => {
    const now = Date.now();
    count.current = now - last.current < 900 ? count.current + 1 : 1;
    last.current = now;
    if (count.current >= taps) {
      count.current = 0;
      haptic("success");
      setOpen(true);
      setTimeout(() => setOpen(false), 5200);
    }
  };

  return (
    <>
      <span onClick={tap} className="cursor-default select-none">
        {children}
      </span>
      <HeartBurst show={open} />
      <AnimatePresence>
        {open && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-4 bottom-28 z-[95] mx-auto max-w-sm rounded-3xl bg-night-900 px-5 py-4 text-center text-moon shadow-float"
            onClick={() => setOpen(false)}
          >
            <p className="text-xs font-extrabold tracking-widest text-wine-200 uppercase">Un segreto ✦</p>
            <p className="mt-1 font-display text-xl leading-snug">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
