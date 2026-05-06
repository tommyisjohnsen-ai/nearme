"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyVendors } from "@/hooks/useNearbyVendors";
import { OrderDialog } from "@/components/OrderDialog";
import { env } from "@/lib/env";
import type { LatLng } from "@/lib/geo";
import type { NearbyVendor } from "@/types/domain";
import { formatDistance, estimatedWalkMinutes } from "@/lib/geo";
import { Button } from "@/components/ui/button";

// Leaflet pulls in `window`; we load it client-only.
const BollebudMap = dynamic(
  () => import("@/components/Map").then((m) => m.BollebudMap),
  { ssr: false, loading: () => <div className="bollebud-map bg-muted animate-pulse" /> },
);

export function CustomerHome() {
  const router = useRouter();
  const { state } = useGeolocation({ enabled: true, minDistanceMeters: 50 });
  const [selected, setSelected] = useState<NearbyVendor | null>(null);

  const center: LatLng = useMemo(() => {
    if (state.status === "ok") return state.position;
    return { lat: env.defaultLat, lng: env.defaultLng };
  }, [state]);

  const { vendors } = useNearbyVendors({ center, radiusM: env.defaultRadiusM });

  useEffect(() => {
    // No-op effect to silence the unused dependency warning if we ever wire up
    // map prefetch — kept for clarity.
  }, []);

  return (
    <>
      <BollebudMap
        center={center}
        radiusM={env.defaultRadiusM}
        vendors={vendors}
        onSelectVendor={setSelected}
      />
      <div className="container py-4 space-y-3">
        {state.status === "denied" && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            Lokasjon avslått — viser sentrum av Oslo. Slå på lokasjon i nettleseren
            for å se utsalg nær deg.
          </p>
        )}
        <h2 className="text-lg font-semibold">
          {vendors.length > 0
            ? `${vendors.length} utsalg innen ${env.defaultRadiusM / 1000} km`
            : "Ingen utsalg i nærheten akkurat nå"}
        </h2>
        <ul className="space-y-2">
          {vendors.map((v) => (
            <li key={v.id} className="rounded-md border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{v.name}</p>
                  {v.description && (
                    <p className="text-sm text-muted-foreground">{v.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistance(v.distanceMeters)} ·{" "}
                    {estimatedWalkMinutes(v.distanceMeters)} min å gå
                  </p>
                </div>
                <Button onClick={() => setSelected(v)}>Bestill</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <OrderDialog
          vendor={selected}
          customerLocation={state.status === "ok" ? state.position : null}
          onClose={() => setSelected(null)}
          onCreated={(orderId) => {
            setSelected(null);
            router.push(`/order/${orderId}`);
          }}
        />
      )}
    </>
  );
}
