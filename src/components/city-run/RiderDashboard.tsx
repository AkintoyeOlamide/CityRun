"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  UserRound,
} from "lucide-react";
import { CityRunShell } from "@/components/city-run/CityRunShell";
import { RiderAccessGate } from "@/components/city-run/rider/RiderAccessGate";
import { RiderNotificationListener } from "@/components/city-run/RiderNotificationListener";
import { RiderNotificationSetup } from "@/components/city-run/RiderNotificationSetup";
import { RiderLocationSetup } from "@/components/city-run/RiderLocationSetup";
import {
  OpsAlert,
  OpsEmptyState,
  OpsSegmentTabs,
  OpsSkeleton,
  OpsStatusBadge,
} from "@/components/city-run/ops/OpsUI";
import { toTelHref } from "@/lib/city-run/phone";
import { useOrdersRealtime } from "@/lib/city-run/use-orders-realtime";
import { useRiderLiveTracking } from "@/lib/city-run/use-rider-location";
import { riderNextAction } from "@/lib/city-run/status-config";
import type { DeliveryOrder, DeliveryOrderStatus, RiderPublic } from "@/lib/city-run/types";

const kindLabels = {
  send: "Send",
  receive: "Receive",
  "store-pickup": "Store pickup",
} as const;

type Filter = "available" | "active" | "history";

export function RiderDashboard() {
  return (
    <RiderAccessGate>
      {(rider) => <RiderDashboardInner rider={rider} />}
    </RiderAccessGate>
  );
}

function RiderDashboardInner({ rider }: { rider: RiderPublic }) {
  const router = useRouter();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<Filter, number>>({
    available: 0,
    active: 0,
    history: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const refreshCounts = useCallback(async () => {
    const entries = await Promise.all(
      (["available", "active", "history"] as const).map(async (key) => {
        const res = await fetch(`/api/cityrun/rider/orders?filter=${key}`);
        if (!res.ok) return [key, 0] as const;
        const list = (await res.json()) as DeliveryOrder[];
        return [key, list.length] as const;
      }),
    );
    setTabCounts(Object.fromEntries(entries) as Record<Filter, number>);
  }, []);

  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/cityrun/rider/orders?filter=${filter}`);
    if (res.ok) setOrders(await res.json());
    setLoading(false);
    void refreshCounts();
  }, [filter, refreshCounts]);

  useEffect(() => {
    setLoading(true);
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  useOrdersRealtime(loadOrders);
  const liveTracking = useRiderLiveTracking();

  async function handleSignOut() {
    await fetch("/api/cityrun/rider/logout", { method: "POST" });
    router.refresh();
  }

  async function updateStatus(
    orderId: string,
    status: DeliveryOrderStatus,
    notifyText: string,
  ) {
    setUpdatingId(orderId);
    setNotifyMessage("");
    setErrorMessage("");
    try {
      const res = await fetch(`/api/cityrun/rider/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        if (status === "rider_assigned") {
          setFilter("active");
          setNotifyMessage("Ride accepted — manage it in Active.");
          if (liveTracking.consent !== "granted") {
            void liveTracking.requestLocationAccess();
          } else {
            void liveTracking.forcePushLocation();
          }
          const activeRes = await fetch("/api/cityrun/rider/orders?filter=active");
          if (activeRes.ok) {
            setOrders(await activeRes.json());
            setLoading(false);
          }
          void refreshCounts();
        } else {
          setNotifyMessage(notifyText);
          await loadOrders();
        }
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(body?.error ?? "Could not update this ride. Try again.");
      }
    } catch {
      setErrorMessage("Network error. Check your connection and try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  const initials = rider.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <RiderNotificationListener />
      <CityRunShell title="Rider" backHref="/cityrun" variant="ops">
        <div className="space-y-5 px-4 py-5 pb-10">
          <RiderNotificationSetup />
          <RiderLocationSetup {...liveTracking} />

          <section className="cr-glass-card cr-glow-ring rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/25 text-base font-bold text-white ring-1 ring-accent/35">
                  {initials || <UserRound className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="cr-text-muted text-xs font-semibold uppercase tracking-wide">
                    Signed in
                  </p>
                  <p className="cr-text-headline truncate text-lg font-bold">
                    {rider.fullName}
                  </p>
                  <p className="cr-text-muted text-xs">@{rider.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.08]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Out
              </button>
            </div>
          </section>

          <OpsSegmentTabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { key: "available", label: "New", count: tabCounts.available },
              { key: "active", label: "Active", count: tabCounts.active },
              { key: "history", label: "History", count: tabCounts.history },
            ]}
          />

          {notifyMessage && <OpsAlert tone="success">{notifyMessage}</OpsAlert>}
          {errorMessage && <OpsAlert tone="error">{errorMessage}</OpsAlert>}

          {loading && (
            <div className="space-y-3">
              <OpsSkeleton className="h-40" />
              <OpsSkeleton className="h-40" />
            </div>
          )}

          {!loading && orders.length === 0 && (
            <OpsEmptyState
              title={
                filter === "available"
                  ? "No new jobs"
                  : filter === "active"
                    ? "No active deliveries"
                    : "No history yet"
              }
              description={
                filter === "available"
                  ? "Dispatch assigns rides to you. New jobs appear under Active."
                  : filter === "active"
                    ? "Assigned rides show here — tap to start delivery."
                    : "Completed and cancelled rides show up here."
              }
            />
          )}

          <ul className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                filter={filter}
                updatingId={updatingId}
                onUpdateStatus={updateStatus}
              />
            ))}
          </ul>
        </div>
      </CityRunShell>
    </>
  );
}

function OrderCard({
  order,
  filter,
  updatingId,
  onUpdateStatus,
}: {
  order: DeliveryOrder;
  filter: Filter;
  updatingId: string | null;
  onUpdateStatus: (
    id: string,
    status: DeliveryOrderStatus,
    notifyText: string,
  ) => void;
}) {
  const nextAction = riderNextAction[order.status];
  const navigateTarget =
    order.status === "picked_up" ||
    order.status === "in_transit" ||
    order.status === "arrived_at_dropoff"
      ? order.dropoff
      : order.pickup;

  const showActions = filter !== "history" && nextAction;
  const customerTel = toTelHref(order.contactPhone);

  return (
    <li className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl">
      <div className="border-b border-white/8 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="cr-text-muted text-[0.65rem] font-bold uppercase tracking-wide">
                {kindLabels[order.kind]}
              </span>
              <span className="font-mono text-[0.65rem] text-accent">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <p className="cr-text-headline mt-2 text-base font-bold leading-snug">
              {order.itemDescription}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <UserRound className="h-3.5 w-3.5 shrink-0 text-white/50" />
              <span className="cr-text-body truncate text-sm font-medium">
                {order.contactName}
              </span>
            </div>
          </div>
          <OpsStatusBadge status={order.status} />
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <RouteLine
          icon={ArrowUpRight}
          label="Pickup"
          address={order.pickup.formatted}
        />
        <RouteLine
          icon={ArrowDownRight}
          label="Dropoff"
          address={order.dropoff.formatted}
        />
        {order.notes && (
          <p className="cr-text-muted rounded-xl bg-white/[0.04] px-3 py-2 text-xs leading-relaxed">
            {order.notes}
          </p>
        )}
        {filter === "history" && (
          <p className="cr-text-muted text-xs">
            Updated {new Date(order.updatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {showActions && (
        <div className="border-t border-white/8 bg-accent/[0.06] px-4 py-4">
          <p className="cr-text-label text-sm font-bold">{nextAction.buttonLabel}</p>
          <p className="cr-text-muted mt-1 text-xs">
            Customer gets notified on their tracking page.
          </p>
          <button
            type="button"
            disabled={updatingId === order.id}
            onClick={() =>
              onUpdateStatus(order.id, nextAction.nextStatus, nextAction.notifyText)
            }
            className="mt-3 w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgb(52_120_246/0.55)] disabled:opacity-40"
          >
            {updatingId === order.id ? "Updating…" : nextAction.buttonLabel}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-white/8 px-4 py-3">
        {customerTel && (
          <a
            href={customerTel}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/[0.08] sm:flex-none"
          >
            <Phone className="h-3.5 w-3.5" />
            Call customer
          </a>
        )}
        <Link
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navigateTarget.formatted)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/[0.08] sm:flex-none"
        >
          <Navigation className="h-3.5 w-3.5" />
          Navigate
        </Link>
        <Link
          href={`/cityrun/order/${order.id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-xs font-bold text-white/75 transition-colors hover:bg-white/[0.08] sm:flex-none"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Tracking
        </Link>
      </div>
    </li>
  );
}

function RouteLine({
  icon: Icon,
  label,
  address,
}: {
  icon: typeof MapPin;
  label: string;
  address: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
        <Icon className="h-4 w-4 text-accent" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="cr-text-muted text-[0.65rem] font-bold uppercase tracking-wide">
          {label}
        </p>
        <p className="cr-text-label mt-0.5 text-sm leading-snug">{address}</p>
      </div>
    </div>
  );
}
