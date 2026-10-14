"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Trash2, CheckCircle2, Package, Radio, XCircle } from "lucide-react";
import { AdminShell } from "@/components/city-run/admin/AdminShell";
import {
  AdminAlert,
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminIconStat,
  AdminRef,
  AdminRow,
  AdminSkeleton,
  AdminTabs,
  formatAdminWhen,
} from "@/components/city-run/admin/AdminUI";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import { formatNairaFromKobo } from "@/lib/city-run/pricing";
import type { CustomerAdminAccount, DeliveryOrder, WalletTransaction } from "@/lib/city-run/types";

const kindLabels = { send: "Send", receive: "Recv", "store-pickup": "Store" } as const;

const typeLabels = {
  individual: "Individual",
  business: "Business",
  vendor: "Vendor",
} as const;

const txTypeLabels: Record<WalletTransaction["type"], string> = {
  topup: "Top-up",
  debit: "Debit",
  refund: "Refund",
  adjustment: "Adjustment",
};

type AccountDetailData = {
  account: CustomerAdminAccount;
  orders: DeliveryOrder[];
};

export function AdminAccountDetail({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [data, setData] = useState<AccountDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [creditAmount, setCreditAmount] = useState("2000");
  const [creditNote, setCreditNote] = useState("Admin wallet credit");
  const [crediting, setCrediting] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");

  const load = useCallback(async () => {
    const [accountRes, walletRes] = await Promise.all([
      fetch(`/api/cityrun/admin/customers/${accountId}`),
      fetch(`/api/cityrun/admin/customers/${accountId}/wallet`),
    ]);

    if (accountRes.ok) {
      const accountData = (await accountRes.json()) as AccountDetailData;
      if (walletRes.ok) {
        const walletData = (await walletRes.json()) as {
          wallet?: { balanceKobo: number };
          transactions?: WalletTransaction[];
        };
        accountData.account.walletBalanceKobo =
          walletData.wallet?.balanceKobo ?? accountData.account.walletBalanceKobo;
        setWalletTransactions(walletData.transactions ?? []);
      }
      setData(accountData);
    }
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteAccount() {
    if (!data) return;
    const label = data.account.businessName || data.account.fullName || data.account.email;
    if (
      !window.confirm(
        `Delete ${label}? This permanently removes the login, profile, and all ${data.account.orderCount} delivery record(s).`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setMessage("");
    setMessageTone("error");
    try {
      const res = await fetch(`/api/cityrun/admin/customers/${accountId}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      router.push("/cityrun/admin/accounts");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function creditWallet() {
    if (!data) return;
    setCrediting(true);
    setMessage("");
    setMessageTone("error");
    try {
      const res = await fetch(`/api/cityrun/admin/customers/${accountId}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountNaira: Number(creditAmount),
          description: creditNote,
        }),
      });
      const body = (await res.json()) as {
        error?: string;
        wallet?: { balanceKobo: number };
        transaction?: WalletTransaction;
      };
      if (!res.ok) throw new Error(body.error ?? "Could not credit wallet");
      setData({
        ...data,
        account: {
          ...data.account,
          walletBalanceKobo: body.wallet?.balanceKobo ?? data.account.walletBalanceKobo,
        },
      });
      if (body.transaction) {
        setWalletTransactions((prev) => [body.transaction!, ...prev]);
      }
      setMessage(`Wallet credited. New balance: ${formatNairaFromKobo(body.wallet?.balanceKobo ?? 0)}`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not credit wallet");
      setMessageTone("error");
    } finally {
      setCrediting(false);
    }
  }

  const orders =
    data?.orders.filter((order) => {
      if (filter === "active") {
        return isActiveDelivery(order.status) || order.status === "confirmed";
      }
      if (filter === "completed") {
        return order.status === "delivered" || order.status === "cancelled";
      }
      return true;
    }) ?? [];

  if (loading) {
    return (
      <AdminShell title="Account">
        <AdminSkeleton className="h-32" />
      </AdminShell>
    );
  }

  if (!data) {
    return (
      <AdminShell title="Account">
        <AdminEmpty title="Account not found" />
      </AdminShell>
    );
  }

  const { account } = data;
  const displayName = account.businessName || account.fullName || account.email;

  return (
    <AdminShell title={displayName}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link href="/cityrun/admin/accounts" className="text-xs font-semibold text-accent">
          ← All accounts
        </Link>
        <AdminBtn variant="danger" disabled={deleting} onClick={deleteAccount}>
          <Trash2 className="h-3.5 w-3.5" />
          {deleting ? "Deleting…" : "Delete account"}
        </AdminBtn>
      </div>

      {message && (
        <div className="mb-3">
          <AdminAlert tone={messageTone}>{message}</AdminAlert>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <AdminIconStat icon={Package} label="Total rides" value={account.orderCount} />
        <AdminIconStat icon={Radio} label="Live" value={account.activeCount} />
        <AdminIconStat icon={CheckCircle2} label="Delivered" value={account.completedCount} />
        <AdminIconStat icon={XCircle} label="Cancelled" value={account.cancelledCount} />
      </div>

      <AdminCard className="mt-4">
        <AdminRow label="Type" value={typeLabels[account.accountType]} />
        <AdminRow label="Name" value={account.fullName || "—"} />
        {account.businessName && <AdminRow label="Business" value={account.businessName} />}
        {account.natureOfGoods && (
          <AdminRow label="Nature of goods" value={account.natureOfGoods} />
        )}
        <AdminRow label="Email" value={account.email || "—"} />
        <AdminRow label="Phone" value={account.phone || "—"} />
        {account.businessAddress?.formatted && (
          <AdminRow label="Pickup address" value={account.businessAddress.formatted} />
        )}
        <AdminRow label="Joined" value={formatAdminWhen(account.createdAt)} />
        {account.loginPassword && (
          <AdminRow label="Login password (ops)" value={account.loginPassword} />
        )}
      </AdminCard>

      <AdminCard className="mt-4">
        <AdminRow
          label="Wallet balance"
          value={formatNairaFromKobo(account.walletBalanceKobo ?? 0)}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="number"
            min={1}
            value={creditAmount}
            onChange={(event) => setCreditAmount(event.target.value)}
            placeholder="Amount in ₦"
            className="rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={creditNote}
            onChange={(event) => setCreditNote(event.target.value)}
            placeholder="Note"
            className="rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
          />
          <AdminBtn disabled={crediting} onClick={() => void creditWallet()}>
            {crediting ? "Crediting…" : "Credit wallet"}
          </AdminBtn>
        </div>
      </AdminCard>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="admin-title text-sm font-semibold">Wallet transactions</h2>
          <Link href="/cityrun/admin/wallets" className="text-xs font-semibold text-accent">
            All wallet ledger →
          </Link>
        </div>

        {walletTransactions.length === 0 ? (
          <AdminEmpty title="No wallet transactions yet" />
        ) : (
          <AdminCard padding="p-0" className="mt-3 overflow-hidden">
            <table className="admin-table w-full text-left text-sm">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                  <th className="hidden text-right md:table-cell">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {walletTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="admin-row-label whitespace-nowrap text-[11px]">
                      {formatAdminWhen(tx.createdAt)}
                    </td>
                    <td className="admin-subtitle text-xs">{txTypeLabels[tx.type]}</td>
                    <td className="admin-cell-truncate max-w-[14rem] text-xs">
                      {tx.description}
                    </td>
                    <td
                      className={`whitespace-nowrap text-right text-xs font-semibold ${
                        tx.type === "debit" ? "text-red-300" : "text-emerald-300"
                      }`}
                    >
                      {tx.type === "debit" ? "-" : "+"}
                      {formatNairaFromKobo(tx.amountKobo)}
                    </td>
                    <td className="hidden whitespace-nowrap text-right text-xs md:table-cell">
                      {formatNairaFromKobo(tx.balanceAfterKobo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
        )}
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="admin-title text-sm font-semibold">Delivery history</h2>
          <AdminTabs
            value={filter}
            onChange={(key) => setFilter(key as typeof filter)}
            tabs={[
              { key: "all", label: "All" },
              { key: "active", label: "Live" },
              { key: "completed", label: "Done" },
            ]}
          />
        </div>

        {orders.length === 0 ? (
          <AdminEmpty title="No rides for this account" />
        ) : (
          <AdminCard padding="p-0" className="mt-3 overflow-hidden">
            <table className="admin-table w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Status</th>
                  <th>Route</th>
                  <th>Rider</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <AdminRef id={order.id} />
                      <span className="admin-subtitle ml-1 text-[0.65rem]">
                        {kindLabels[order.kind]}
                      </span>
                    </td>
                    <td>
                      <AdminBadge status={order.status} />
                    </td>
                    <td className="admin-cell-truncate max-w-[12rem] text-xs">
                      {order.dropoff.formatted}
                    </td>
                    <td className="admin-cell-truncate text-xs">
                      {order.riderName ?? "—"}
                    </td>
                    <td className="admin-row-label text-[11px]">
                      {formatAdminWhen(order.updatedAt)}
                    </td>
                    <td>
                      <Link
                        href={`/cityrun/admin/orders/${order.id}`}
                        className="admin-link-chevron"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
        )}
      </div>
    </AdminShell>
  );
}
