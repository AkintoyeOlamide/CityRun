import { OrderTracking } from "@/components/city-run/OrderTracking";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  return <OrderTracking orderId={id} />;
}
