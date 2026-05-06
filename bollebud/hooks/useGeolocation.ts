"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";

export type GeolocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "ok"; position: LatLng; accuracy: number; timestamp: number }
  | { status: "denied" }
  | { status: "unavailable"; message: string };

type Options = {
  enabled: boolean;
  highAccuracy?: boolean;
  // Notify only when we've moved more than this many meters since the last
  // *committed* update. Cuts unnecessary writes.
  minDistanceMeters?: number;
  // Hard floor between callbacks regardless of distance.
  minIntervalMs?: number;
};

// Watches navigator.geolocation. Returns latest fix + an optional callback the
// caller can use as a throttled "should sync now" signal.
export function useGeolocation(opts: Options) {
  const [state, setState] = useState<GeolocationState>({ status: "idle" });
  const watchIdRef = useRef<number | null>(null);
  const lastSyncRef = useRef<{ pos: LatLng; t: number } | null>(null);

  useEffect(() => {
    if (!opts.enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", message: "Geolokasjon støttes ikke" });
      return;
    }

    setState({ status: "requesting" });
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          status: "ok",
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState({ status: "denied" });
        } else {
          setState({ status: "unavailable", message: err.message });
        }
      },
      {
        enableHighAccuracy: opts.highAccuracy ?? true,
        maximumAge: 5000,
        timeout: 20000,
      },
    );
    watchIdRef.current = id;

    return () => {
      navigator.geolocation.clearWatch(id);
      watchIdRef.current = null;
    };
  }, [opts.enabled, opts.highAccuracy]);

  // Marks a position as synced and tells the caller whether enough has changed
  // since the previous sync to bother writing again.
  function shouldSync(pos: LatLng): boolean {
    const minDistance = opts.minDistanceMeters ?? 10;
    const minInterval = opts.minIntervalMs ?? 15_000;
    const last = lastSyncRef.current;
    const now = Date.now();
    if (!last) {
      lastSyncRef.current = { pos, t: now };
      return true;
    }
    const dt = now - last.t;
    if (dt < minInterval) return false;
    const dx = haversine(last.pos, pos);
    if (dx < minDistance && dt < 60_000) return false;
    lastSyncRef.current = { pos, t: now };
    return true;
  }

  return { state, shouldSync };
}

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
