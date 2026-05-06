"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { statusLabel, type OrderStatus } from "@/types/domain";

type Row = {
  id: string;
  status: OrderStatus;
  bun_count: number;
  fulfillment: "pickup" | "delivery";
  created_at: string;
  customer_id: string;
  vendor: { name: string } | null;
  customerName: string | null;
};

const STATUS_FILTERS: (OrderStatus | "all")[] = [
  "all",
  "requested",
  "accepted",
  "en_route",
  "delivered",
  "cancelled",
];

export function AdminOrdersTable() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const query = supabase
        .from("orders")
        .select(
          "id, status, bun_count, fulfillment, created_at, customer_id, vendor:vendors(name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);

      const { data } = filter === "all" ? await query : await query.eq("status", filter);
      if (!data || cancelled) return;

      // Fetch the unique customer profiles in one round-trip.
      const customerIds = Array.from(new Set(data.map((r) => r.customer_id)));
      const { data: customers } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", customerIds);
      const nameById = new Map(
        (customers ?? []).map((c) => [c.id, c.display_name]),
      );

      setRows(
        data.map((r) => ({
          id: r.id,
          status: r.status,
          bun_count: r.bun_count,
          fulfillment: r.fulfillment,
          created_at: r.created_at,
          customer_id: r.customer_id,
          vendor: r.vendor as { name: string } | null,
          customerName: nameById.get(r.customer_id) ?? null,
        })),
      );
    }
    void load();
  }, [filter]);

  const total = rows.length;
  const filters = useMemo(() => STATUS_FILTERS, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-2 py-1 rounded-md border ${
              f === filter ? "bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            {f === "all" ? "Alle" : statusLabel[f]}
          </button>
        ))}
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {total} treff
        </span>
      </div>
      <div className="rounded-md border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Tid</th>
              <th className="p-3">Kunde</th>
              <th className="p-3">Utsalg</th>
              <th className="p-3">Detaljer</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("nb-NO", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="p-3">{r.customerName ?? "—"}</td>
                <td className="p-3">{r.vendor?.name ?? "—"}</td>
                <td className="p-3">
                  {r.bun_count} stk · {r.fulfillment === "pickup" ? "Henter" : "Leveres"}
                </td>
                <td className="p-3">
                  <Badge variant={r.status === "delivered" ? "success" : "default"}>
                    {statusLabel[r.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-center text-sm text-muted-foreground p-6">
            Ingen bestillinger med dette filteret.
          </p>
        )}
      </div>
    </div>
  );
}
