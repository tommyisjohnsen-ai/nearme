import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CustomerHome } from "@/components/CustomerHome";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Vendors get sent to their dashboard automatically.
  if (profile?.role === "vendor") redirect("/vendor/dashboard");

  return <CustomerHome />;
}
