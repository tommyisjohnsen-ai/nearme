import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Conventional channel names. Keep names stable — clients subscribe to these.
export const channels = {
  order: (orderId: string) => `order:${orderId}`,
  vendorSessions: "vendor_sessions:active",
} as const;

type Client = SupabaseClient<Database>;

// Subscribes to INSERTs on order_messages for one order.
export function subscribeToOrderMessages(
  client: Client,
  orderId: string,
  onMessage: (row: Database["public"]["Tables"]["order_messages"]["Row"]) => void,
): RealtimeChannel {
  return client
    .channel(channels.order(orderId))
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "order_messages",
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => {
        onMessage(payload.new as Database["public"]["Tables"]["order_messages"]["Row"]);
      },
    )
    .subscribe();
}

// Subscribes to status changes on a single order.
export function subscribeToOrderStatus(
  client: Client,
  orderId: string,
  onUpdate: (row: Database["public"]["Tables"]["orders"]["Row"]) => void,
): RealtimeChannel {
  return client
    .channel(`${channels.order(orderId)}:status`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        onUpdate(payload.new as Database["public"]["Tables"]["orders"]["Row"]);
      },
    )
    .subscribe();
}
