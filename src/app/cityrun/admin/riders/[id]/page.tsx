import type { Metadata } from "next";
import { AdminAccessGate } from "@/components/city-run/admin/AdminAccessGate";
import { AdminRiderDetail } from "@/components/city-run/admin/AdminRiderDetail";

export const metadata: Metadata = {
  title: "City Run Admin — Rider",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminRiderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AdminAccessGate>
      <AdminRiderDetail riderId={id} />
    </AdminAccessGate>
  );
}
