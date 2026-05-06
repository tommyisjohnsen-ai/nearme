// Domain view-models. These are what UI components consume.
// Keep them decoupled from `Database` row shapes so refactors don't ripple.

import type { LatLng } from "@/lib/geo";

export type UserRole = "customer" | "vendor" | "admin";

export type OrderStatus =
  | "requested"
  | "accepted"
  | "en_route"
  | "delivered"
  | "cancelled";

export type FulfillmentType = "pickup" | "delivery";

export type Profile = {
  id: string;
  role: UserRole;
  displayName: string | null;
  phone: string | null;
};

export type Vendor = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type NearbyVendor = Vendor & {
  distanceMeters: number;
  location: LatLng;
  lastSeenAt: string;
  sessionId: string;
};

export type Order = {
  id: string;
  customerId: string;
  vendorId: string;
  fulfillment: FulfillmentType;
  bunCount: number;
  customerNote: string | null;
  customerLocation: LatLng | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrderMessage = {
  id: string;
  orderId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

// Allowed status transitions. Mirror the Postgres `transition_order_status`
// function — keep these in sync.
export const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  requested: ["accepted", "cancelled"],
  accepted: ["en_route", "cancelled"],
  en_route: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export const statusLabel: Record<OrderStatus, string> = {
  requested: "Forespurt",
  accepted: "Akseptert",
  en_route: "På vei",
  delivered: "Levert",
  cancelled: "Avbrutt",
};
