import type { Metadata } from "next";
import { AdminAccessGate } from "@/components/city-run/admin/AdminAccessGate";
import { AdminOrderDetail } from "@/components/city-run/admin/AdminOrderDetail";

export const metadata: Metadata = {
  title: "City Run Admin — Ride",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AdminAccessGate>
      <AdminOrderDetail orderId={id} />
    </AdminAccessGate>
  );
}
