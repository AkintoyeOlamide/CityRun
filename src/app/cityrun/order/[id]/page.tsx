import { Suspense } from "react";
import { OrderTracking } from "@/components/city-run/OrderTracking";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="cr-mesh-page min-h-dvh" />}>
      <OrderTracking orderId={id} />
    </Suspense>
  );
}
