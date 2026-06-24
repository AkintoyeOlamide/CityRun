"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { AdminShell } from "@/components/city-run/admin/AdminShell";
import { DeliveryLiveMapSection } from "@/components/city-run/DeliveryLiveMapSection";
import { DeliveryTimeline } from "@/components/city-run/DeliveryTimeline";
import {
  ADMIN_INPUT,
  AdminAlert,
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminField,
  AdminRef,
  AdminRow,
  AdminSkeleton,
  formatAdminWhen,
} from "@/components/city-run/admin/AdminUI";
import type { DeliveryOrderEvent } from "@/lib/city-run/order-events";
import {
  customerStatusLabels,
  isActiveDelivery,
} from "@/lib/city-run/status-config";
import type { DeliveryOrder, DeliveryOrderStatus, RiderAdmin } from "@/lib/city-run/types";

const kindLabels = { send: "Send", receive: "Receive", "store-pickup": "Store pickup" } as const;

const allStatuses: DeliveryOrderStatus[] = [
  "pending", "confirmed", "rider_assigned", "en_route_pickup", "picked_up",
  "in_transit", "arrived_at_dropoff", "delivered", "cancelled",
];

const assignableStatuses = new Set<DeliveryOrderStatus>(["pending", "confirmed"]);

type RiderOption = Pick<RiderAdmin, "id" | "fullName" | "username" | "active">;

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [events, setEvents] = useState<DeliveryOrderEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [nextStatus, setNextStatus] = useState<DeliveryOrderStatus>("pending");
  const [adminNote, setAdminNote] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const loadOrderDetail = useCallback(async () => {
    const res = await fetch(`/api/cityrun/admin/orders/${orderId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as {
        order: DeliveryOrder;
        events: DeliveryOrderEvent[];
      };
      setOrder(body.order);
      setEvents(body.events);
    } else {
      setOrder(null);
    }
    setOrderLoading(false);
    setEventsLoading(false);
  }, [orderId]);

  const reloadOrder = loadOrderDetail;

  const loadRiders = useCallback(async () => {
    const res = await fetch("/api/cityrun/admin/riders");
    if (res.ok) {
      const list = (await res.json()) as RiderAdmin[];
      setRiders(list.filter((r) => r.active).map((r) => ({
        id: r.id,
        fullName: r.fullName,
        username: r.username,
        active: r.active,
      })));
    }
  }, []);

  useEffect(() => {
    setOrderLoading(true);
    setEventsLoading(true);
    void loadOrderDetail();
  }, [loadOrderDetail]);

  useEffect(() => {
    if (!order || !isActiveDelivery(order.status)) return;
    const interval = window.setInterval(() => {
      void loadOrderDetail();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [order?.status, loadOrderDetail]);

  useEffect(() => {
    void loadRiders();
  }, [loadRiders]);

  useEffect(() => {
    if (order) setNextStatus(order.status);
  }, [order?.status, order]);

  async function assignRider() {
    if (!selectedRiderId) return;
    setAssigning(true);
    setMessage("");
    try {
      const res = await fetch(`/api/cityrun/admin/orders/${orderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId: selectedRiderId,
          note: assignNote.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Allocation failed");
      setEvents(body.events);
      setNextStatus(body.order.status);
      setAssignNote("");
      setMessage("Rider allocated — they have been notified.");
      await reloadOrder();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Allocation failed");
    } finally {
      setAssigning(false);
    }
  }

  async function applyStatus(status: DeliveryOrderStatus) {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/cityrun/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note: adminNote.trim() || undefined,
          ...(order?.riderName ? { riderName: order.riderName } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Update failed");
      setEvents(body.events);
      setNextStatus(body.order.status);
      setAdminNote("");
      setMessage("Updated.");
      await reloadOrder();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRide() {
    if (!order || !window.confirm("Delete this ride permanently? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    setMessage("");
    try {
      const res = await fetch(`/api/cityrun/admin/orders/${orderId}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      router.push("/cityrun/admin");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  const loading = orderLoading || eventsLoading;
  const canAssign = order ? assignableStatuses.has(order.status) && !order.riderId : false;
  const isLive = order ? isActiveDelivery(order.status) : false;

  return (
    <AdminShell title={order ? `#${order.id.slice(0, 8).toUpperCase()}` : "Ride"}>
      {loading && (
        <div className="space-y-3">
          <AdminSkeleton className="h-20" />
          <AdminSkeleton className="h-[52vh]" />
          <AdminSkeleton className="h-48" />
        </div>
      )}

      {!loading && !order && <AdminAlert tone="info">Not found.</AdminAlert>}

      {order && (
        <div className="space-y-4">
          <AdminCard className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <AdminRef id={order.id} />
              <p className="admin-title mt-1 text-sm font-medium">{kindLabels[order.kind]}</p>
              <p className="admin-subtitle text-xs">{formatAdminWhen(order.createdAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isLive && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/35 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  Live
                </span>
              )}
              <AdminBadge status={order.status} />
              <AdminBtn variant="danger" disabled={deleting} onClick={deleteRide}>
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting…" : "Delete ride"}
              </AdminBtn>
            </div>
          </AdminCard>

          {(order.pickup.lat || order.dropoff.lat || order.riderLocation) && (
            <AdminCard padding="p-3">
              <DeliveryLiveMapSection
                order={order}
                titleClassName="admin-stat-label text-xs font-semibold uppercase tracking-wide"
                waitingClassName="admin-subtitle px-1 text-xs"
              />
            </AdminCard>
          )}

          <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
            <div className="space-y-4">
              <DeliveryTimeline status={order.status} riderName={order.riderName} />

              <AdminCard>
                <AdminRow label="Pickup" value={order.pickup.formatted} />
                <AdminRow label="Dropoff" value={order.dropoff.formatted} />
                <AdminRow label="Contact" value={`${order.contactName} · ${order.contactPhone}`} />
                <AdminRow label="Item" value={`${order.itemDescription} (${order.itemSize})`} />
                {order.riderName && <AdminRow label="Rider" value={order.riderName} />}
                {order.riderPhone && <AdminRow label="Rider phone" value={order.riderPhone} />}
                {order.notes && <AdminRow label="Notes" value={order.notes} />}
              </AdminCard>

              {order.itemPhotoUrl && (
                <div className="relative aspect-video max-w-sm overflow-hidden rounded-lg border border-[var(--admin-border)]">
                  <Image src={order.itemPhotoUrl} alt="Item" fill className="object-cover" sizes="320px" unoptimized />
                </div>
              )}

              {events.length > 0 && (
                <AdminCard>
                  <p className="admin-stat-label mb-2 text-xs font-semibold uppercase tracking-wide">History</p>
                  <ul className="space-y-1.5">
                    {events.map((ev) => (
                      <li key={ev.id} className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                        <span className="font-medium text-accent">{customerStatusLabels[ev.status]}</span>
                        <span className="admin-subtitle">{formatAdminWhen(ev.createdAt)}</span>
                        {(ev.actor || ev.note) && (
                          <span className="admin-subtitle w-full">{[ev.actor, ev.note].filter(Boolean).join(" · ")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </AdminCard>
              )}

              <Link href={`/cityrun/order/${order.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent">
                Customer view →
              </Link>
            </div>

            <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
              <AdminCard>
                <p className="admin-stat-label mb-3 text-xs font-semibold uppercase tracking-wide">Allocate rider</p>
                {order.riderId && order.riderName ? (
                  <div className="mb-2 rounded-md border border-[var(--admin-accent-border)] bg-[var(--admin-accent-soft)] px-2.5 py-2">
                    <p className="admin-subtitle text-xs">Assigned to</p>
                    <p className="admin-title mt-0.5 text-sm font-semibold">{order.riderName}</p>
                    {order.riderPhone && (
                      <p className="admin-subtitle mt-0.5 text-xs">{order.riderPhone}</p>
                    )}
                  </div>
                ) : canAssign ? (
                  <>
                    <AdminField label="Rider">
                      <select
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        className={`${ADMIN_INPUT} py-2`}
                      >
                        <option value="">Select rider…</option>
                        {riders.map((rider) => (
                          <option key={rider.id} value={rider.id}>
                            {rider.fullName} (@{rider.username})
                          </option>
                        ))}
                      </select>
                    </AdminField>
                    <AdminField label="Note (optional)">
                      <input
                        type="text"
                        value={assignNote}
                        onChange={(e) => setAssignNote(e.target.value)}
                        placeholder="Internal note"
                        className={ADMIN_INPUT}
                      />
                    </AdminField>
                    <AdminBtn
                      variant="primary"
                      className="mt-2 w-full"
                      disabled={assigning || !selectedRiderId}
                      onClick={assignRider}
                    >
                      {assigning ? "Allocating…" : "Allocate rider"}
                    </AdminBtn>
                    <p className="admin-subtitle mt-2 text-[0.65rem] leading-relaxed">
                      Only the selected rider will be notified and can take this ride.
                    </p>
                    {message && canAssign && (
                      <div className="mt-2">
                        <AdminAlert tone={message.includes("failed") || message.includes("already") || message.includes("missing") || message.includes("Cannot") ? "error" : "success"}>{message}</AdminAlert>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="admin-subtitle text-sm">
                    {order.status === "cancelled" || order.status === "delivered"
                      ? "This ride is closed."
                      : "Rider already allocated for this ride."}
                  </p>
                )}
              </AdminCard>

              <AdminCard>
                <p className="admin-stat-label mb-3 text-xs font-semibold uppercase tracking-wide">Update status</p>
                <AdminField label="Status">
                  <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as DeliveryOrderStatus)} className={`${ADMIN_INPUT} py-2`}>
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>{customerStatusLabels[s]}</option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Note">
                  <input type="text" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Optional" className={ADMIN_INPUT} />
                </AdminField>
                <button type="button" disabled={saving || nextStatus === order.status} onClick={() => applyStatus(nextStatus)} className="mt-2 w-full rounded-md bg-accent py-2 text-[13px] font-medium text-white disabled:opacity-40">
                  {saving ? "Saving…" : "Save"}
                </button>
                {order.status !== "cancelled" && order.status !== "delivered" && (
                  <button type="button" disabled={saving} onClick={() => applyStatus("cancelled")} className="mt-2 w-full rounded-lg border border-red-500/30 py-2 text-xs font-semibold text-red-300 disabled:opacity-40">
                    Cancel ride
                  </button>
                )}
                {message && (
                  <div className="mt-2">
                    <AdminAlert tone={message.includes("failed") || message.includes("already") || message.includes("missing") || message.includes("Cannot") ? "error" : "success"}>{message}</AdminAlert>
                  </div>
                )}
              </AdminCard>
            </aside>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
