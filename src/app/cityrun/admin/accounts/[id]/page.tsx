import { AdminAccessGate } from "@/components/city-run/admin/AdminAccessGate";
import { AdminAccountDetail } from "@/components/city-run/admin/AdminAccountDetail";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminAccountDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AdminAccessGate>
      <AdminAccountDetail accountId={id} />
    </AdminAccessGate>
  );
}
