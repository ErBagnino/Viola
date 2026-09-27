"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useIsClient } from "@/hooks/use-is-client";

/**
 * Bottom sheet on phones, centred dialog on larger screens.
 * Escape / backdrop close, focus moves into the sheet and back on close.
 *
 * The open/close effect depends on `open` ONLY: parents pass a new
 * `onClose` arrow on every render (e.g. at every keystroke in a form), and
 * re-running the effect would move the focus away from the field being
 * typed in (back to the page, then onto the X button).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
  wide,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isClient = useIsClient();

  const onEscape = useEffectEvent(() => {
    if (dismissible) onClose();
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Initial focus, once: an explicit [data-autofocus], else (with a mouse)
    // the first field, else the dialog itself — never the close button, and
    // never away from a field the user already tapped.
    const t = setTimeout(() => {
      const root = ref.current;
      if (!root || root.contains(document.activeElement)) return;
      const explicit = root.querySelector<HTMLElement>("[data-autofocus]");
      const field = window.matchMedia("(pointer: fine)").matches
        ? root.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled])')
        : null;
      (explicit ?? field ?? root).focus({ preventScroll: true });
    }, 60);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-wine-900/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissible ? onClose : undefined}
            aria-hidden
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cn(
              "relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-cream-50 p-5 pb-8 shadow-float outline-none sm:rounded-[2rem]",
              wide ? "sm:max-w-2xl" : "sm:max-w-lg",
              "safe-bottom",
              className,
            )}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-tint-100 sm:hidden" aria-hidden />
            {(title || dismissible) && (
              <div className="mb-3 flex items-start justify-between gap-3">
                {title ? (
                  <h2 id={titleId} className="text-xl font-semibold text-vio-900">
                    {title}
                  </h2>
                ) : (
                  <span />
                )}
                {dismissible && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="press -mr-1 -mt-1 grid size-10 place-items-center rounded-full text-vio-700 hover:bg-tint-50"
                    aria-label="Chiudi"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
