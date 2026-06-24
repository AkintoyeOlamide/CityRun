"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trash2, UserPlus } from "lucide-react";
import { AdminShell } from "@/components/city-run/admin/AdminShell";
import {
  AdminAlert,
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
  AdminSearch,
  AdminSkeleton,
  AdminTabs,
  AdminToolbar,
  formatAdminWhen,
} from "@/components/city-run/admin/AdminUI";
import type { AccountType, CustomerAdminAccount } from "@/lib/city-run/types";

type Filter = "all" | AccountType;

const typeLabels: Record<AccountType, string> = {
  individual: "Individual",
  business: "Business",
  vendor: "Vendor",
};

export function AdminAccountsPanel() {
  const [accounts, setAccounts] = useState<CustomerAdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    const params = new URLSearchParams();
    if (filter !== "all") params.set("type", filter);
    const res = await fetch(`/api/cityrun/admin/customers?${params}`);
    if (res.ok) {
      setAccounts(await res.json());
    } else {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setLoadError(body?.error ?? "Could not load accounts");
      setAccounts([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const filtered = accounts.filter((account) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      account.fullName.toLowerCase().includes(q) ||
      account.email.toLowerCase().includes(q) ||
      account.phone.includes(q) ||
      (account.businessName?.toLowerCase().includes(q) ?? false)
    );
  });

  const allSelected =
    filtered.length > 0 && filtered.every((account) => selectedIds.has(account.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    const ids = [...selectedIds];
    if (
      !ids.length ||
      !window.confirm(
        `Delete ${ids.length} account(s)? This removes their profile, login, and all delivery history permanently.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/cityrun/admin/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const body = (await res.json()) as { error?: string; count?: number };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      setSelectedIds(new Set());
      setMessage(`Deleted ${body.count ?? ids.length} account(s).`);
      setLoading(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminShell title="Accounts">
      <AdminPageHeader
        title="Customer accounts"
        description="Individuals, businesses, and vendors — view history or remove completely."
        action={
          <Link
            href="/cityrun/admin/vendors"
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-border)] px-2.5 py-1.5 text-xs font-medium"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Onboard vendor
          </Link>
        }
      />

      <AdminToolbar>
        <AdminSearch value={query} onChange={setQuery} placeholder="Search name, email, phone…" />
        <AdminTabs
          value={filter}
          onChange={(key) => {
            setFilter(key as Filter);
            setSelectedIds(new Set());
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

      {filtered.length > 0 && !loading && (
        <div className="mt-2 flex items-center gap-2">
          <label className="admin-checkbox-label flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                setSelectedIds(
                  allSelected ? new Set() : new Set(filtered.map((a) => a.id)),
                )
              }
              className="h-3.5 w-3.5 rounded accent-accent"
            />
            Select all
          </label>
          <AdminBtn variant="danger" disabled={!selectedIds.size || deleting} onClick={deleteSelected}>
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "Deleting…" : `Delete${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
          </AdminBtn>
        </div>
      )}

      <div className="mt-2 space-y-2">
        {loadError && <AdminAlert tone="error">{loadError}</AdminAlert>}
        {error && <AdminAlert tone="error">{error}</AdminAlert>}
        {message && <AdminAlert tone="success">{message}</AdminAlert>}
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            <AdminSkeleton className="h-14" />
            <AdminSkeleton className="h-14" />
            <AdminSkeleton className="h-14" />
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmpty title="No accounts match this filter" />
        ) : (
          <AdminCard padding="p-0" className="overflow-hidden">
            <table className="admin-table w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="w-9" />
                  <th>Name</th>
                  <th>Type</th>
                  <th className="hidden md:table-cell">Contact</th>
                  <th>Rides</th>
                  <th>Joined</th>
                  <th className="w-9" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((account) => (
                  <tr
                    key={account.id}
                    className={selectedIds.has(account.id) ? "admin-row-selected" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(account.id)}
                        onChange={() => toggleSelect(account.id)}
                        className="h-3.5 w-3.5 rounded accent-accent"
                      />
                    </td>
                    <td>
                      <p className="admin-row-value font-medium">
                        {account.businessName || account.fullName || "—"}
                      </p>
                      {account.businessName && account.fullName && (
                        <p className="admin-row-label text-[0.65rem]">{account.fullName}</p>
                      )}
                    </td>
                    <td>
                      <span className="admin-subtitle text-xs">
                        {typeLabels[account.accountType]}
                      </span>
                    </td>
                    <td className="hidden md:table-cell">
                      <p className="admin-cell-truncate admin-row-value text-xs">{account.email}</p>
                      <p className="admin-row-label text-[0.65rem]">{account.phone}</p>
                    </td>
                    <td>
                      <p className="text-xs">
                        {account.orderCount} total
                        {account.activeCount > 0 && (
                          <span className="ml-1 text-accent">· {account.activeCount} live</span>
                        )}
                      </p>
                    </td>
                    <td className="admin-row-label text-[11px]">
                      {formatAdminWhen(account.createdAt)}
                    </td>
                    <td>
                      <Link
                        href={`/cityrun/admin/accounts/${account.id}`}
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
