import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GoOnlineToggle } from "@/components/GoOnlineToggle";
import { VendorOrdersList } from "@/components/VendorOrdersList";

export const dynamic = "force-dynamic";

export default async function VendorDashboardPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name, description, is_active")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!vendor) {
    return (
      <div className="container max-w-md py-10 text-center space-y-3">
        <h1 className="text-2xl font-bold">Ingen utsalg registrert</h1>
        <p className="text-muted-foreground">
          Gå til{" "}
          <a className="underline" href="/onboarding">
            oppsett
          </a>{" "}
          for å opprette utsalget ditt.
        </p>
      </div>
    );
  }

  if (!vendor.is_active) {
    return (
      <div className="container max-w-md py-10 text-center space-y-3">
        <h1 className="text-2xl font-bold">Utsalget er deaktivert</h1>
        <p className="text-muted-foreground">
          En administrator har skrudd det av. Ta kontakt for å gjenåpne.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{vendor.name}</h1>
        {vendor.description && (
          <p className="text-sm text-muted-foreground">{vendor.description}</p>
        )}
      </div>

      <GoOnlineToggle vendorId={vendor.id} />

      <section>
        <h2 className="text-lg font-semibold mb-2">Bestillinger</h2>
        <VendorOrdersList vendorId={vendor.id} />
      </section>
    </div>
  );
}
