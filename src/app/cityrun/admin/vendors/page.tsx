import { AdminAccessGate } from "@/components/city-run/admin/AdminAccessGate";
import { AdminVendorsPanel } from "@/components/city-run/admin/AdminVendorsPanel";

export default function AdminVendorsPage() {
  return (
    <AdminAccessGate>
      <AdminVendorsPanel />
    </AdminAccessGate>
  );
}
