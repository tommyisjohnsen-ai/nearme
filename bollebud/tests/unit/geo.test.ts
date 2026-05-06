import { describe, it, expect } from "vitest";
import {
  haversineMeters,
  formatDistance,
  estimatedWalkMinutes,
  parsePoint,
} from "@/lib/geo";

describe("geo", () => {
  it("haversine — same point is 0m", () => {
    const p = { lat: 59.9139, lng: 10.7522 };
    expect(haversineMeters(p, p)).toBeCloseTo(0, 5);
  });

  it("haversine — Oslo to Stockholm is roughly 415 km", () => {
    const oslo = { lat: 59.9139, lng: 10.7522 };
    const sthlm = { lat: 59.3293, lng: 18.0686 };
    const m = haversineMeters(oslo, sthlm);
    expect(m).toBeGreaterThan(410_000);
    expect(m).toBeLessThan(420_000);
  });

  it("formatDistance — buckets correctly", () => {
    expect(formatDistance(20)).toBe("rett ved deg");
    expect(formatDistance(450)).toBe("450 m");
    expect(formatDistance(2500)).toBe("2.5 km");
  });

  it("estimatedWalkMinutes — never under 1", () => {
    expect(estimatedWalkMinutes(10)).toBe(1);
    expect(estimatedWalkMinutes(1500)).toBeGreaterThan(10);
  });

  it("parsePoint — handles WKT and GeoJSON shapes", () => {
    expect(parsePoint("POINT(10.75 59.91)")).toEqual({ lng: 10.75, lat: 59.91 });
    expect(parsePoint({ coordinates: [10.75, 59.91] })).toEqual({
      lng: 10.75,
      lat: 59.91,
    });
    expect(parsePoint(null)).toBeNull();
    expect(parsePoint("garbage")).toBeNull();
  });
});
