"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AdminShell } from "@/components/city-run/admin/AdminShell";
import {
  AdminAlert,
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
  AdminSearch,
  AdminSkeleton,
  AdminTabs,
  AdminToolbar,
  formatAdminWhen,
} from "@/components/city-run/admin/AdminUI";
import { formatNairaFromKobo } from "@/lib/city-run/pricing";
import type {
  AccountType,
  AdminWalletAccount,
  AdminWalletTransaction,
} from "@/lib/city-run/types";

type Filter = "all" | AccountType;
type View = "balances" | "transactions";

const typeLabels: Record<AccountType, string> = {
  individual: "Individual",
  business: "Business",
  vendor: "Vendor",
};

const txTypeLabels: Record<AdminWalletTransaction["type"], string> = {
  topup: "Top-up",
  debit: "Debit",
  refund: "Refund",
  adjustment: "Adjustment",
};

export function AdminWalletTransactionsPanel() {
  const [view, setView] = useState<View>("balances");
  const [accounts, setAccounts] = useState<AdminWalletAccount[]>([]);
  const [transactions, setTransactions] = useState<AdminWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    const params = new URLSearchParams();
    if (filter !== "all") params.set("type", filter);

    if (view === "balances") {
      const res = await fetch(`/api/cityrun/admin/wallet/accounts?${params}`);
      if (res.ok) {
        setAccounts(await res.json());
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setLoadError(body?.error ?? "Could not load wallet balances");
        setAccounts([]);
      }
    } else {
      const res = await fetch(`/api/cityrun/admin/wallet/transactions?${params}`);
      if (res.ok) {
        setTransactions(await res.json());
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setLoadError(body?.error ?? "Could not load wallet transactions");
        setTransactions([]);
      }
    }

    setLoading(false);
  }, [filter, view]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const filteredAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (account) =>
        account.accountName.toLowerCase().includes(q) ||
        account.accountEmail.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.accountName.toLowerCase().includes(q) ||
        tx.accountEmail.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q),
    );
  }, [query, transactions]);

  const totalFundedKobo = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balanceKobo, 0),
    [accounts],
  );

  return (
    <AdminShell title="Wallet ledger">
      <AdminPageHeader
        title="Wallets"
        description="Funded wallet balances and transaction history for individuals, businesses, and vendors."
      />

      <AdminToolbar>
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder={
            view === "balances"
              ? "Search account or email…"
              : "Search account, email, description…"
          }
        />
        <AdminTabs
          value={view}
          onChange={(key) => {
            setView(key as View);
            setLoading(true);
          }}
          tabs={[
            { key: "balances", label: "Funded wallets" },
            { key: "transactions", label: "Transactions" },
          ]}
        />
        <AdminTabs
          value={filter}
          onChange={(key) => {
            setFilter(key as Filter);
            setLoading(true);
          }}
          tabs={[
            { key: "all", label: "All" },
            { key: "individual", label: "Individual" },
            { key: "business", label: "Business" },
            { key: "vendor", label: "Vendor" },
          ]}
        />
      </AdminToolbar>

      {view === "balances" && !loading && accounts.length > 0 && (
        <p className="mt-2 text-xs text-white/60">
          {filteredAccounts.length} funded wallet
          {filteredAccounts.length === 1 ? "" : "s"} · Total{" "}
          {formatNairaFromKobo(totalFundedKobo)}
        </p>
      )}

      {loadError && (
        <div className="mt-2">
          <AdminAlert tone="error">{loadError}</AdminAlert>
        </div>
      )}

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            <AdminSkeleton className="h-12" />
            <AdminSkeleton className="h-12" />
            <AdminSkeleton className="h-12" />
          </div>
        ) : view === "balances" ? (
          filteredAccounts.length === 0 ? (
            <AdminEmpty title="No funded wallets yet" />
          ) : (
            <AdminCard padding="p-0" className="overflow-hidden">
              <table className="admin-table w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Type</th>
                    <th className="text-right">Balance</th>
                    <th className="hidden md:table-cell">Updated</th>
                    <th className="w-9" />
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account.userId}>
                      <td>
                        <p className="admin-row-value font-medium">{account.accountName}</p>
                        <p className="admin-row-label text-[0.65rem]">
                          {account.accountEmail || "No email on file"}
                          {!account.hasProfile ? " · No profile" : ""}
                        </p>
                      </td>
                      <td className="admin-subtitle text-xs">
                        {typeLabels[account.accountType]}
                      </td>
                      <td className="whitespace-nowrap text-right text-xs font-semibold text-emerald-300">
                        {formatNairaFromKobo(account.balanceKobo)}
                      </td>
                      <td className="admin-row-label hidden whitespace-nowrap text-[11px] md:table-cell">
                        {formatAdminWhen(account.updatedAt)}
                      </td>
                      <td>
                        <Link
                          href={`/cityrun/admin/accounts/${account.userId}`}
                          className="admin-link-chevron"
                          aria-label="View account"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminCard>
          )
        ) : filteredTransactions.length === 0 ? (
          <AdminEmpty title="No wallet transactions yet" />
        ) : (
          <AdminCard padding="p-0" className="overflow-hidden">
            <table className="admin-table w-full text-left text-sm">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                  <th className="hidden text-right md:table-cell">Balance after</th>
                  <th className="w-9" />
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="admin-row-label whitespace-nowrap text-[11px]">
                      {formatAdminWhen(tx.createdAt)}
                    </td>
                    <td>
                      <p className="admin-row-value font-medium">{tx.accountName}</p>
                      <p className="admin-row-label text-[0.65rem]">
                        {typeLabels[tx.accountType]}
                        {tx.accountEmail ? ` · ${tx.accountEmail}` : ""}
                      </p>
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
                    <td>
                      <Link
                        href={`/cityrun/admin/accounts/${tx.userId}`}
                        className="admin-link-chevron"
                        aria-label="View account"
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
