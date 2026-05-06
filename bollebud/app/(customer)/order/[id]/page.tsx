import { OrderPageBody } from "@/components/OrderPageBody";

export const dynamic = "force-dynamic";

export default function CustomerOrderPage({ params }: { params: { id: string } }) {
  return <OrderPageBody orderId={params.id} />;
}
