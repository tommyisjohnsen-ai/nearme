import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminVendorsTable } from "@/components/AdminVendorsTable";
import { AdminOrdersTable } from "@/components/AdminOrdersTable";

export const dynamic = "force-dynamic";

async function getKpis() {
  const supabase = getSupabaseServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();

  const [{ count: ordersToday }, { data: deliveredToday }, { data: vendorActivity }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfDay),
      supabase
        .from("orders")
        .select("created_at, updated_at")
        .eq("status", "delivered")
        .gte("created_at", startOfDay),
      supabase
        .from("orders")
        .select("vendor_id, vendors(name)")
        .gte("created_at", startOfDay),
    ]);

  const avgMinutes = (() => {
    if (!deliveredToday || deliveredToday.length === 0) return null;
    const totalMs = deliveredToday.reduce((acc, o) => {
      return (
        acc +
        (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime())
      );
    }, 0);
    return Math.round(totalMs / deliveredToday.length / 60_000);
  })();

  const topVendor = (() => {
    if (!vendorActivity) return null;
    const counts = new Map<string, { name: string; count: number }>();
    for (const row of vendorActivity) {
      const v = (row as unknown as { vendors: { name: string } | null }).vendors;
      const name = v?.name ?? "Ukjent";
      const prev = counts.get(row.vendor_id);
      counts.set(row.vendor_id, { name, count: (prev?.count ?? 0) + 1 });
    }
    let best: { name: string; count: number } | null = null;
    for (const v of counts.values()) {
      if (!best || v.count > best.count) best = v;
    }
    return best;
  })();

  return {
    ordersToday: ordersToday ?? 0,
    deliveredToday: deliveredToday?.length ?? 0,
    avgMinutes,
    topVendor,
  };
}

export default async function AdminPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const kpis = await getKpis();

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Bestillinger i dag" value={kpis.ordersToday.toString()} />
        <KpiCard label="Levert i dag" value={kpis.deliveredToday.toString()} />
        <KpiCard
          label="Snitt-tid til levert"
          value={kpis.avgMinutes !== null ? `${kpis.avgMinutes} min` : "—"}
        />
        <KpiCard
          label="Mest aktive utsalg"
          value={
            kpis.topVendor
              ? `${kpis.topVendor.name} (${kpis.topVendor.count})`
              : "—"
          }
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Utsalg</h2>
        <AdminVendorsTable />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Bestillinger</h2>
        <AdminOrdersTable />
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <CardTitle>{value}</CardTitle>
      </CardContent>
    </Card>
  );
}
