import { AdminAccessGate } from "@/components/city-run/admin/AdminAccessGate";
import { AdminRidersLivePanel } from "@/components/city-run/admin/AdminRidersLivePanel";

export default function AdminLiveRidersPage() {
  return (
    <AdminAccessGate>
      <AdminRidersLivePanel />
    </AdminAccessGate>
  );
}
