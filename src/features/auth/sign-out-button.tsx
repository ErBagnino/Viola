"use client";

import { LogOut } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/** Logs out and wipes cached private pages from the service worker. */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form
      action="/auth/signout"
      method="post"
      onSubmit={() => {
        navigator.serviceWorker?.controller?.postMessage("CLEAR_PRIVATE_CACHE");
        try {
          sessionStorage.clear();
        } catch {
          /* ignore */
        }
      }}
    >
      <button type="submit" className={buttonClass({ variant: "outline", size: "md", className })}>
        <LogOut className="size-4" /> Esci
      </button>
    </form>
  );
}
