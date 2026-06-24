import type { Metadata } from "next";
import { AdminAccessGate } from "@/components/city-run/admin/AdminAccessGate";
import { AdminDashboard } from "@/components/city-run/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "City Run Admin — Operations",
  robots: { index: false, follow: false },
};

export default function CityRunAdminPage() {
  return (
    <AdminAccessGate>
      <AdminDashboard />
    </AdminAccessGate>
  );
}
