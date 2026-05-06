import { statusLabel } from "@/types/domain";
import type { Database } from "@/types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export function OrderHeader({
  order,
  vendorName,
  customerName,
}: {
  order: Order;
  vendorName: string;
  customerName: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-sm text-muted-foreground">
        Bestilling #{order.id.slice(0, 8)}
      </p>
      <p className="text-lg font-semibold">
        {order.bun_count} {order.bun_count === 1 ? "bolle" : "boller"} ·{" "}
        {order.fulfillment === "pickup" ? "Henter selv" : "Levering"}
      </p>
      <p className="text-sm text-muted-foreground">
        {customerName} ↔ {vendorName} · {statusLabel[order.status]}
      </p>
      {order.customer_note && (
        <p className="text-sm mt-2 border-t pt-2">{order.customer_note}</p>
      )}
    </div>
  );
}
