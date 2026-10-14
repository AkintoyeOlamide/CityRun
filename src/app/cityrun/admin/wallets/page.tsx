import { AdminAccessGate } from "@/components/city-run/admin/AdminAccessGate";
import { AdminWalletTransactionsPanel } from "@/components/city-run/admin/AdminWalletTransactionsPanel";

export const metadata = {
  title: "Wallet ledger",
  robots: { index: false, follow: false },
};

export default function AdminWalletTransactionsPage() {
  return (
    <AdminAccessGate>
      <AdminWalletTransactionsPanel />
    </AdminAccessGate>
  );
}
