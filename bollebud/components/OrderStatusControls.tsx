"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  allowedTransitions,
  statusLabel,
  type OrderStatus,
} from "@/types/domain";
import { subscribeToOrderStatus } from "@/lib/realtime";

type Props = {
  orderId: string;
  initialStatus: OrderStatus;
  isVendor: boolean;
};

// The label users see for "I'm now doing X" — depends on role + current status.
function nextStatusLabel(role: "vendor" | "customer", next: OrderStatus): string {
  if (next === "accepted") return "Aksepter";
  if (next === "en_route") return role === "vendor" ? "På vei" : "Marker som på vei";
  if (next === "delivered") return "Marker levert";
  if (next === "cancelled") return "Avbryt";
  return statusLabel[next];
}

export function OrderStatusControls({ orderId, initialStatus, isVendor }: Props) {
  const supabase = getSupabaseBrowserClient();
  const toast = useToast();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [working, setWorking] = useState<OrderStatus | null>(null);

  // Live-update if the other party transitions.
  useEffect(() => {
    const channel = subscribeToOrderStatus(supabase, orderId, (row) => {
      setStatus(row.status);
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  async function transition(next: OrderStatus) {
    setWorking(next);
    try {
      const { data, error } = await supabase.rpc("transition_order_status", {
        p_order_id: orderId,
        p_new_status: next,
      });
      if (error) throw error;
      if (data) setStatus((data as { status: OrderStatus }).status);
      toast({ title: `Status: ${statusLabel[next]}` });

      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          kind: "status",
          bodyOverride: `Ny status: ${statusLabel[next]}`,
        }),
      }).catch(() => {});
    } catch (err) {
      toast({
        title: "Kunne ikke endre status",
        description: err instanceof Error ? err.message : "Prøv igjen",
        variant: "destructive",
      });
    } finally {
      setWorking(null);
    }
  }

  const transitions = allowedTransitions[status];
  const role = isVendor ? "vendor" : "customer";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Status</span>
        <Badge variant={status === "delivered" ? "success" : "default"}>
          {statusLabel[status]}
        </Badge>
      </div>

      {transitions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {transitions.map((next) => (
            <Button
              key={next}
              variant={next === "cancelled" ? "outline" : "default"}
              onClick={() => transition(next)}
              disabled={working !== null}
            >
              {nextStatusLabel(role, next)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
