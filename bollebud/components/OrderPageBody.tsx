import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ChatThread } from "@/components/ChatThread";
import { OrderStatusControls } from "@/components/OrderStatusControls";
import { OrderHeader } from "@/components/OrderHeader";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";

// Server component shared by /(customer)/order/[id] and /(vendor)/order/[id].
// Loads the order with auth in place, then hands off to client components.
export async function OrderPageBody({ orderId }: { orderId: string }) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, vendors(name, owner_id)")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) notFound();

  const vendor = (order as unknown as { vendors: { name: string; owner_id: string } }).vendors;
  const isVendor = vendor.owner_id === user.id;

  // Look up the customer's display name. RLS only lets the customer or the
  // vendor-owner read the row (the policy on profiles allows own-row + admin).
  const { data: customer } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", order.customer_id)
    .maybeSingle();
  const customerName = customer?.display_name ?? "Kunde";

  return (
    <div className="container max-w-2xl py-6 space-y-4">
      <OrderHeader
        order={order}
        vendorName={vendor.name}
        customerName={customerName}
      />
      <OrderStatusControls
        orderId={order.id}
        initialStatus={order.status}
        isVendor={isVendor}
      />
      <PushPermissionPrompt />
      <ChatThread orderId={order.id} currentUserId={user.id} />
    </div>
  );
}
