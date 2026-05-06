import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

// Internal endpoint that fans out push notifications for an order event.
// Called from the client right after status changes / message inserts —
// keeps things simple without requiring DB triggers + Edge Functions for MVP.
//
// In v2: replace with a Postgres trigger -> Supabase Edge Function so the
// notification fires even if the client tab dies before the request lands.

const schema = z.object({
  orderId: z.string().uuid(),
  kind: z.enum(["status", "message"]),
  bodyOverride: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { orderId, kind, bodyOverride } = parsed.data;

  // Resolve participants. Admin client because we need the vendor's owner_id
  // even if the caller doesn't normally have access.
  const admin = getSupabaseAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, status, customer_id, vendor_id, vendors(owner_id, name)")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // The caller must be one of the participants — sanity check.
  const vendorOwnerId = (order as unknown as { vendors: { owner_id: string; name: string } }).vendors.owner_id;
  const vendorName = (order as unknown as { vendors: { owner_id: string; name: string } }).vendors.name;
  const isParticipant =
    user.id === order.customer_id || user.id === vendorOwnerId;
  if (!isParticipant) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const recipientId = user.id === order.customer_id ? vendorOwnerId : order.customer_id;
  const url = user.id === order.customer_id
    ? `/vendor/order/${orderId}`
    : `/order/${orderId}`;

  const title =
    kind === "status"
      ? `Bestilling: ${order.status}`
      : `Ny melding fra ${vendorName}`;
  const body = bodyOverride ?? "Åpne for å se detaljer";

  const result = await sendPushToUser(recipientId, {
    title,
    body,
    url,
    tag: `order-${orderId}-${kind}`,
  });

  return NextResponse.json({ ok: true, ...result });
}
