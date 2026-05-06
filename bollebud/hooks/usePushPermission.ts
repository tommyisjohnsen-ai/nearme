"use client";

import { useCallback, useEffect, useState } from "react";
import { env } from "@/lib/env";

export type PushState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied"
  | "subscribed";

// Manages the browser-side push subscription lifecycle.
export function usePushPermission() {
  const [state, setState] = useState<PushState>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }

    void (async () => {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setState("subscribed");
        return;
      }
      setState(Notification.permission as PushState);
    })();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!env.vapidPublicKey) {
      console.warn("[push] VAPID public key not configured");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission as PushState);
      return false;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8(env.vapidPublicKey),
    });

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!res.ok) return false;
    setState("subscribed");
    return true;
  }, []);

  return { state, subscribe };
}

// Standard Web Push helper — converts URL-safe base64 VAPID key to bytes.
function urlBase64ToUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
