"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Package,
  Radio,
  Trash2,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/components/city-run/admin/AdminShell";
import { PasswordInput } from "@/components/city-run/PasswordInput";
import {
  ADMIN_INPUT,
  AdminAlert,
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminField,
  AdminIconStat,
  AdminRef,
  AdminRow,
  AdminSkeleton,
  AdminTabs,
  formatAdminWhen,
} from "@/components/city-run/admin/AdminUI";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import type { DeliveryOrder, RiderAdmin } from "@/lib/city-run/types";

const kindLabels = { send: "Send", receive: "Recv", "store-pickup": "Store" } as const;

type RiderDetailData = {
  rider: RiderAdmin;
  orders: DeliveryOrder[];
  stats: { total: number; active: number; completed: number; cancelled: number };
};

export function AdminRiderDetail({ riderId }: { riderId: string }) {
  const router = useRouter();
  const [data, setData] = useState<RiderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const load = useCallback(async () => {
    const res = await fetch(`/api/cityrun/admin/riders/${riderId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [riderId]);

  useEffect(() => { load(); }, [load]);

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) return;
    setSaving(true); setMessage("");
    try {
      const res = await fetch(`/api/cityrun/admin/riders/${riderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      setMessage(`Password updated for @${body.username ?? data?.rider.username}.`);
      setNewPassword("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRider() {
    if (!data || !window.confirm(`Delete ${data.rider.fullName}?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cityrun/admin/riders/${riderId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      router.push("/cityrun/admin/riders");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  const orders =
    data?.orders.filter((o) => {
      if (filter === "active") return isActiveDelivery(o.status) || o.status === "confirmed";
      if (filter === "completed") return o.status === "delivered" || o.status === "cancelled";
      return true;
    }) ?? [];

  if (loading) {
    return (
      <AdminShell title="Rider">
        <AdminSkeleton className="h-32" />
      </AdminShell>
    );
  }

  if (!data) {
    return (
      <AdminShell title="Rider">
        <AdminEmpty title="Rider not found" />
      </AdminShell>
    );
  }

  const { rider, stats } = data;

  return (
    <AdminShell title={rider.fullName}>
      <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3">
          <AdminCard>
            <AdminRow label="Username" value={`@${rider.username}`} mono />
            <AdminRow label="Phone" value={rider.phone || "—"} />
            <AdminRow label="Status" value={rider.active ? "Active" : "Disabled"} />
            <AdminRow label="Joined" value={formatAdminWhen(rider.createdAt)} />
            <div className="admin-divider flex items-baseline justify-between gap-3 border-b py-2">
              <span className="admin-row-label shrink-0 text-xs">Password</span>
              <span className="flex items-center gap-1 font-mono text-xs text-accent">
                {showPassword ? (rider.loginPassword ?? "—") : "••••••"}
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="admin-link-chevron">
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </span>
            </div>
            <AdminBtn variant="danger" className="mt-3 w-full" disabled={deleting} onClick={deleteRider}>
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "…" : "Delete"}
            </AdminBtn>
          </AdminCard>

          <AdminCard>
            <p className="admin-subtitle mb-2 text-xs font-semibold">Reset password</p>
            <form onSubmit={resetPassword} className="space-y-2">
              <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 chars" inputClassName={`${ADMIN_INPUT} pr-10`} minLength={6} />
              <button type="submit" disabled={saving || newPassword.length < 6} className="w-full rounded-lg bg-accent py-2 text-xs font-semibold text-white disabled:opacity-40">
                {saving ? "…" : "Save"}
              </button>
            </form>
            {message && <div className="mt-2"><AdminAlert tone={message.includes("Failed") ? "error" : "success"}>{message}</AdminAlert></div>}
          </AdminCard>

          <div className="grid grid-cols-2 gap-2">
            <AdminIconStat icon={Package} label="Total" value={stats.total} />
            <AdminIconStat icon={Radio} label="Active" value={stats.active} />
            <AdminIconStat icon={CheckCircle2} label="Done" value={stats.completed} />
            <AdminIconStat icon={XCircle} label="Cancelled" value={stats.cancelled} />
          </div>
        </aside>

        <section>
          <AdminTabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "completed", label: "Done" },
            ]}
          />

          {orders.length === 0 ? (
            <div className="mt-4"><AdminEmpty title="No rides" /></div>
          ) : (
            <AdminCard padding="p-0" className="mt-4 overflow-hidden">
              <table className="admin-table w-full text-sm">
                <thead>
                  <tr className="text-[0.65rem] font-semibold uppercase">
                    <th>Ref</th>
                    <th>Status</th>
                    <th className="hidden sm:table-cell">Dropoff</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <AdminRef id={order.id} />
                        <span className="admin-subtitle ml-1 text-[11px]">{kindLabels[order.kind]}</span>
                      </td>
                      <td><AdminBadge status={order.status} /></td>
                      <td className="admin-subtitle hidden max-w-[200px] truncate text-xs sm:table-cell">
                        {order.dropoff.formatted}
                      </td>
                      <td>
                        <Link href={`/cityrun/admin/orders/${order.id}`} className="admin-link-chevron">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminCard>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
