// Geo helpers used both client- and server-side.
// Postgres / PostGIS does the authoritative radius queries; this is for UI.

const EARTH_RADIUS_M = 6_371_000;
const WALK_SPEED_MS = 1.4; // ~5 km/h, average pedestrian.

export type LatLng = { lat: number; lng: number };

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 50) return "rett ved deg";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function estimatedWalkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_SPEED_MS / 60));
}

// Reads PostGIS geography output that Supabase returns as either WKT
// "POINT(lng lat)" or the GeoJSON-ish object form, depending on RPC shape.
export function parsePoint(input: unknown): LatLng | null {
  if (!input) return null;
  if (typeof input === "string") {
    const m = input.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!m) return null;
    return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
  }
  if (typeof input === "object" && "coordinates" in (input as object)) {
    const coords = (input as { coordinates: [number, number] }).coordinates;
    return { lng: coords[0], lat: coords[1] };
  }
  return null;
}
