"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { statusLabel, type OrderStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

type Row = Database["public"]["Tables"]["orders"]["Row"];

type Props = { vendorId: string };

const ACTIVE: OrderStatus[] = ["requested", "accepted", "en_route"];

export function VendorOrdersList({ vendorId }: Props) {
  const supabase = getSupabaseBrowserClient();
  const [orders, setOrders] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("vendor_id", vendorId)
        .in("status", ACTIVE)
        .order("created_at", { ascending: false });
      if (!cancelled && data) setOrders(data);
    }
    void load();

    const channel = supabase
      .channel(`vendor-orders:${vendorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `vendor_id=eq.${vendorId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [vendorId, supabase]);

  if (orders.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Ingen aktive bestillinger akkurat nå.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            href={`/vendor/order/${o.id}`}
            className="block rounded-md border bg-card p-4 hover:bg-accent"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {o.bun_count} {o.bun_count === 1 ? "bolle" : "boller"} ·{" "}
                  {o.fulfillment === "pickup" ? "Henter selv" : "Levering"}
                </p>
                {o.customer_note && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {o.customer_note}
                  </p>
                )}
              </div>
              <Badge variant={o.status === "requested" ? "default" : "secondary"}>
                {statusLabel[o.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(o.created_at).toLocaleTimeString("nb-NO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
