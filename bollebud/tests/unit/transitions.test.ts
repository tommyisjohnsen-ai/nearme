import { describe, it, expect } from "vitest";
import { canTransition, allowedTransitions } from "@/types/domain";

describe("order status transitions", () => {
  it("requested -> accepted is allowed", () => {
    expect(canTransition("requested", "accepted")).toBe(true);
  });
  it("requested -> delivered is rejected", () => {
    expect(canTransition("requested", "delivered")).toBe(false);
  });
  it("delivered is terminal", () => {
    expect(allowedTransitions.delivered).toEqual([]);
  });
  it("cancelled is terminal", () => {
    expect(allowedTransitions.cancelled).toEqual([]);
  });
  it("any active state may cancel", () => {
    expect(canTransition("requested", "cancelled")).toBe(true);
    expect(canTransition("accepted", "cancelled")).toBe(true);
    expect(canTransition("en_route", "cancelled")).toBe(true);
  });
});
