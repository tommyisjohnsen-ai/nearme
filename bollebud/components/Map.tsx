"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { formatDistance, estimatedWalkMinutes, type LatLng } from "@/lib/geo";
import type { NearbyVendor } from "@/types/domain";
import { Button } from "@/components/ui/button";

// Leaflet's default icon URLs break under bundlers. Re-bind them.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const vendorIcon = L.divIcon({
  className: "bollebud-vendor-icon",
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">🥐</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const meIcon = L.divIcon({
  className: "bollebud-me-icon",
  html: `<div style="width:14px;height:14px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px rgba(59,130,246,.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center.lat, center.lng, map]);
  return null;
}

type Props = {
  center: LatLng;
  radiusM: number;
  vendors: NearbyVendor[];
  onSelectVendor: (v: NearbyVendor) => void;
};

export function BollebudMap({ center, radiusM, vendors, onSelectVendor }: Props) {
  return (
    <MapContainer
      className="bollebud-map"
      center={[center.lat, center.lng]}
      zoom={15}
      scrollWheelZoom
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      <Marker position={[center.lat, center.lng]} icon={meIcon}>
        <Popup>Du er her</Popup>
      </Marker>
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusM}
        pathOptions={{ color: "#e07a2b", fillOpacity: 0.05, weight: 1 }}
      />
      {vendors.map((v) => (
        <Marker key={v.id} position={[v.location.lat, v.location.lng]} icon={vendorIcon}>
          <Popup>
            <div className="space-y-2 min-w-[180px]">
              <div>
                <p className="font-semibold">{v.name}</p>
                {v.description && (
                  <p className="text-xs text-muted-foreground">{v.description}</p>
                )}
              </div>
              <div className="text-xs">
                {formatDistance(v.distanceMeters)} ·{" "}
                {estimatedWalkMinutes(v.distanceMeters)} min å gå
              </div>
              <Button size="sm" className="w-full" onClick={() => onSelectVendor(v)}>
                Bestill her
              </Button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
