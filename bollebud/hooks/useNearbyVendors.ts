"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LatLng } from "@/lib/geo";
import type { NearbyVendor } from "@/types/domain";

type Args = { center: LatLng | null; radiusM: number; refreshMs?: number };

// Polls nearby_vendors RPC. Realtime would be lower latency but requires
// streaming all vendor_session updates per client; polling at 10s is plenty
// for foot-speed movement.
export function useNearbyVendors({ center, radiusM, refreshMs = 10_000 }: Args) {
  const [vendors, setVendors] = useState<NearbyVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!center) return;
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    async function load() {
      if (!center) return;
      setLoading(true);
      const { data, error } = await supabase.rpc("nearby_vendors", {
        lat: center.lat,
        lng: center.lng,
        radius_m: radiusM,
      });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const mapped: NearbyVendor[] = (data ?? []).map((row) => ({
        id: row.vendor_id,
        ownerId: row.owner_id,
        name: row.name,
        description: row.description,
        isActive: true,
        distanceMeters: row.distance_m,
        location: { lat: row.lat, lng: row.lng },
        lastSeenAt: row.last_seen_at,
        sessionId: row.session_id,
      }));
      setVendors(mapped);
      setError(null);
      setLoading(false);
    }

    void load();
    const t = window.setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [center?.lat, center?.lng, radiusM, refreshMs]);

  return { vendors, loading, error };
}
