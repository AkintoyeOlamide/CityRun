"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/city-run/admin/AdminShell";
import {
  ADMIN_INPUT,
  AdminAlert,
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminRef,
  AdminSearch,
  AdminSkeleton,
  AdminStatRow,
  AdminTabs,
  AdminToolbar,
  formatAdminWhen,
} from "@/components/city-run/admin/AdminUI";
import { useOrdersRealtime } from "@/lib/city-run/use-orders-realtime";
import type { DeliveryOrder, DeliveryOrderStatus, RiderAdmin } from "@/lib/city-run/types";

type Stats = {
  total: number;
  pending: number;
  active: number;
  delivered: number;
  cancelled: number;
  deliveredToday: number;
};

type Filter = "all" | "pending" | "active" | "completed" | "cancelled";

const kindLabels = { send: "Send", receive: "Recv", "store-pickup": "Store" } as const;

const assignableStatuses = new Set<DeliveryOrderStatus>(["pending", "confirmed"]);

function canAllocateOrder(order: DeliveryOrder) {
  return assignableStatuses.has(order.status) && !order.riderId;
}

type RiderOption = Pick<RiderAdmin, "id" | "fullName" | "username">;

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [riderPick, setRiderPick] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/cityrun/admin/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const loadOrders = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/cityrun/admin/orders?${params}`);
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }, [filter, query]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    fetch("/api/cityrun/admin/riders")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: RiderAdmin[]) => {
        setRiders(
          list
            .filter((r) => r.active)
            .map((r) => ({ id: r.id, fullName: r.fullName, username: r.username })),
        );
      })
      .catch(() => setRiders([]));
  }, []);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => loadOrders(), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadOrders, query]);
  useOrdersRealtime(() => { loadOrders(); loadStats(); });

  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    const ids = [...selectedIds];
    if (!ids.length || !window.confirm(`Delete ${ids.length} ride(s)?`)) return;
    setDeleting(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/cityrun/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const body = (await res.json()) as { error?: string; count?: number };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      setSelectedIds(new Set());
      setMsg(`Deleted ${body.count ?? ids.length}.`);
      await loadOrders(); await loadStats();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function assignRider(orderId: string) {
    const riderId = riderPick[orderId];
    if (!riderId) return;
    setAssigningId(orderId);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/cityrun/admin/orders/${orderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Allocation failed");
      setMsg("Rider allocated.");
      setRiderPick((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      await loadOrders();
      await loadStats();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Allocation failed");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <AdminShell title="Orders">
      {stats ? (
        <AdminStatRow
          items={[
            { label: "Pending", value: stats.pending, accent: true },
            { label: "Live", value: stats.active, accent: true },
            { label: "Done today", value: stats.deliveredToday },
            { label: "Total", value: stats.total },
          ]}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-14" />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <AdminToolbar>
          <AdminSearch value={query} onChange={setQuery} placeholder="Search rides…" />
          <AdminTabs
            value={filter}
            onChange={(k) => { setFilter(k); setSelectedIds(new Set()); }}
            tabs={[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "active", label: "Live" },
              { key: "completed", label: "Done" },
              { key: "cancelled", label: "Cancelled" },
            ]}
          />
        </AdminToolbar>

        {orders.length > 0 && !loading && (
          <div className="flex shrink-0 items-center gap-2 lg:ml-4">
            <label className="admin-checkbox-label flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelectedIds(allSelected ? new Set() : new Set(orders.map((o) => o.id)))
                }
                className="h-3.5 w-3.5 rounded accent-accent"
              />
              All
            </label>
            <AdminBtn
              variant="danger"
              disabled={!selectedIds.size || deleting}
              onClick={deleteSelected}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "…" : `Delete${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
            </AdminBtn>
          </div>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {err && <AdminAlert tone="error">{err}</AdminAlert>}
        {msg && <AdminAlert tone="success">{msg}</AdminAlert>}
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            <AdminSkeleton className="h-12" />
            <AdminSkeleton className="h-12" />
            <AdminSkeleton className="h-12" />
          </div>
        ) : orders.length === 0 ? (
          <AdminEmpty title="No rides match this filter" />
        ) : (
          <AdminCard padding="p-0" className="overflow-hidden">
            <table className="admin-table w-full text-left text-sm">
              <colgroup>
                <col className="w-9" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[20%]" />
                <col className="w-[13%]" />
                <col className="w-[28%]" />
                <col className="w-[11%]" />
                <col className="w-9" />
              </colgroup>
              <thead>
                <tr>
                  <th />
                  <th>Ref</th>
                  <th>Status</th>
                  <th>Route</th>
                  <th className="hidden md:table-cell">Contact</th>
                  <th>Allocate rider</th>
                  <th>Time</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const sel = selectedIds.has(order.id);
                  const allocating = assigningId === order.id;
                  const pickedRider = riderPick[order.id] ?? "";
                  return (
                    <tr key={order.id} className={sel ? "admin-row-selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSelect(order.id)}
                          className="h-3.5 w-3.5 rounded accent-accent"
                        />
                      </td>
                      <td>
                        <AdminRef id={order.id} />
                        <span className="admin-subtitle ml-1 text-[0.65rem]">
                          {kindLabels[order.kind]}
                        </span>
                      </td>
                      <td>
                        <AdminBadge status={order.status} />
                      </td>
                      <td className="admin-cell-truncate admin-row-value text-xs">
                        {order.dropoff.formatted}
                      </td>
                      <td className="hidden md:table-cell">
                        <p className="admin-cell-truncate admin-row-value text-xs">{order.contactName}</p>
                        <p className="admin-cell-truncate admin-row-label text-[0.65rem]">{order.contactPhone}</p>
                      </td>
                      <td>
                        {order.riderId || order.riderName ? (
                          <div className="min-w-0">
                            <p className="admin-cell-truncate admin-row-value text-xs font-medium">{order.riderName}</p>
                            {order.riderPhone && (
                              <p className="admin-cell-truncate admin-row-label text-[0.65rem]">{order.riderPhone}</p>
                            )}
                          </div>
                        ) : canAllocateOrder(order) ? (
                          <div className="flex min-w-0 items-center gap-1.5 xl:gap-2">
                            <select
                              value={pickedRider}
                              onChange={(e) =>
                                setRiderPick((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              className={`${ADMIN_INPUT} min-w-0 flex-1 py-1.5 text-xs`}
                              disabled={allocating}
                            >
                              <option value="">Select rider…</option>
                              {riders.map((rider) => (
                                <option key={rider.id} value={rider.id}>
                                  {rider.fullName}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={allocating || !pickedRider}
                              onClick={() => assignRider(order.id)}
                              className="shrink-0 rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                            >
                              {allocating ? "…" : "Allocate"}
                            </button>
                          </div>
                        ) : (
                          <span className="admin-subtitle text-xs">—</span>
                        )}
                      </td>
                      <td className="admin-cell-truncate admin-row-label text-[11px]">
                        {formatAdminWhen(order.updatedAt)}
                      </td>
                      <td>
                        <Link
                          href={`/cityrun/admin/orders/${order.id}`}
                          className="admin-link-chevron"
                          aria-label="Open ride"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminCard>
        )}
      </div>
    </AdminShell>
  );
}
