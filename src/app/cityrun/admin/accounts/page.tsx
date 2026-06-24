import { AdminAccessGate } from "@/components/city-run/admin/AdminAccessGate";
import { AdminAccountsPanel } from "@/components/city-run/admin/AdminAccountsPanel";

export default function AdminAccountsPage() {
  return (
    <AdminAccessGate>
      <AdminAccountsPanel />
    </AdminAccessGate>
  );
}
