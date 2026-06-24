import type { Metadata } from "next";
import { AdminAccessGate } from "@/components/city-run/admin/AdminAccessGate";
import { AdminRidersPanel } from "@/components/city-run/admin/AdminRidersPanel";

export const metadata: Metadata = {
  title: "City Run Admin — Riders",
  robots: { index: false, follow: false },
};

export default function AdminRidersPage() {
  return (
    <AdminAccessGate>
      <AdminRidersPanel />
    </AdminAccessGate>
  );
}
