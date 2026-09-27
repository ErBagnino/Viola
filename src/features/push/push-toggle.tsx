"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { publicEnv } from "@/lib/env";
import { removePushSubscription, savePushSubscription } from "./actions";
import { callAction } from "@/utils/call-action";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "needs-install" | "not-configured" | "denied" | "off" | "on";

export function PushToggle({ label = "Notifiche su questo dispositivo" }: { label?: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      if (!publicEnv.vapidPublicKey) return setState("not-configured");
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !standalone ? "needs-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicEnv.vapidPublicKey) });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await callAction(() => savePushSubscription({ endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent.slice(0, 300) }));
      if (!res.ok) throw new Error(res.error);
      setState("on");
      toast.show("Notifiche attivate ♡");
    } catch {
      toast.show("Non sono riuscito ad attivare le notifiche.", "error");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await callAction(() => removePushSubscription(sub.endpoint));
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  const hint: Partial<Record<State, string>> = {
    unsupported: "Questo browser non supporta le notifiche.",
    "needs-install": "Su iPhone le notifiche funzionano dopo aver aggiunto l'app alla schermata Home (Condividi → Aggiungi alla schermata Home).",
    "not-configured": "Le notifiche push non sono ancora configurate (chiavi VAPID).",
    denied: "Le notifiche sono bloccate: riattivale dalle impostazioni del telefono per questa app.",
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-lilac-100 text-lilac-600">
          {state === "needs-install" ? <Smartphone className="size-5" /> : state === "on" ? <Bell className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-vio-900">{label}</p>
          <p className="text-xs text-ink-muted">{hint[state] ?? (state === "on" ? "Attive ♡" : state === "off" ? "Spente" : "…")}</p>
        </div>
      </div>
      {(state === "on" || state === "off") && (
        <Button size="sm" variant={state === "on" ? "soft" : "primary"} loading={busy} onClick={state === "on" ? disable : enable}>
          {state === "on" ? "Disattiva" : "Attiva"}
        </Button>
      )}
    </div>
  );
}
