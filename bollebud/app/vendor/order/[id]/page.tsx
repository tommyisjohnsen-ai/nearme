import { OrderPageBody } from "@/components/OrderPageBody";

export const dynamic = "force-dynamic";

export default function VendorOrderPage({ params }: { params: { id: string } }) {
  return <OrderPageBody orderId={params.id} />;
}
