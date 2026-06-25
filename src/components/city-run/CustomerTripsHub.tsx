"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Package,
  Send,
  Store,
} from "lucide-react";
import { CityRunBottomNav } from "@/components/city-run/CityRunBottomNav";
import { OpsSegmentTabs } from "@/components/city-run/ops/OpsUI";
import { useAuth } from "@/lib/auth/use-auth";
import { pickActiveOrders } from "@/lib/city-run/use-active-delivery-order";
import {
  fetchMyOrdersCached,
  invalidateMyOrdersCache,
  ORDERS_CHANGED_EVENT,
} from "@/lib/city-run/my-orders-cache";
import {
  customerStatusLabels,
  isActiveDelivery,
} from "@/lib/city-run/status-config";
import type { DeliveryOrder } from "@/lib/city-run/types";

const kindIcons = {
  send: Send,
  receive: Package,
  "store-pickup": Store,
} as const;

type TripTab = "active" | "pending" | "completed";

function filterTrips(orders: DeliveryOrder[], tab: TripTab) {
  if (tab === "active") {
    return pickActiveOrders(orders);
  }
  if (tab === "pending") {
    return orders
      .filter((o) => ["pending", "confirmed"].includes(o.status))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
  return orders
    .filter((o) => o.status === "delivered" || o.status === "cancelled")
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export function CustomerTripsHub() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TripTab>("active");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const list = await fetchMyOrdersCached();
    setOrders(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadOrders();
  }, [user, loadOrders]);

  useEffect(() => {
    if (!user) return;
    function onOrdersChanged() {
      invalidateMyOrdersCache();
      void loadOrders();
    }
    window.addEventListener(ORDERS_CHANGED_EVENT, onOrdersChanged);
    return () => window.removeEventListener(ORDERS_CHANGED_EVENT, onOrdersChanged);
  }, [user, loadOrders]);

  if (!user) {
    return (
      <div className="min-h-dvh bg-cr-page cr-mesh-page px-4 py-10 text-center text-white">
        <p className="text-sm text-white/60">Sign in to view your trips.</p>
        <Link href="/cityrun/account" className="mt-4 inline-block text-sm font-semibold text-accent">
          Go to account →
        </Link>
      </div>
    );
  }

  const filtered = filterTrips(orders, tab);
  const counts = {
    active: pickActiveOrders(orders).length,
    pending: filterTrips(orders, "pending").length,
    completed: filterTrips(orders, "completed").length,
  };

  return (
    <div className="min-h-dvh bg-cr-page cr-mesh-page text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col pb-28">
        <header className="cr-ops-header px-4 py-4">
          <h1 className="cr-text-headline text-xl font-bold">My trips</h1>
          <p className="cr-text-muted mt-1 text-sm">
            Track active deliveries and review completed runs
          </p>
        </header>

        <main className="flex-1 space-y-4 px-4 py-2">
          <OpsSegmentTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: "active", label: "Active", count: counts.active },
              { key: "pending", label: "Pending", count: counts.pending },
              { key: "completed", label: "Done", count: counts.completed },
            ]}
          />

          {loading && (
            <p className="text-sm text-white/50">Loading trips…</p>
          )}

          {!loading && filtered.length === 0 && (
            <div className="cr-glass-card rounded-2xl px-4 py-10 text-center">
              <Package className="mx-auto h-8 w-8 text-white/30" />
              <p className="mt-3 text-sm text-white/50">
                {tab === "active"
                  ? "No active trips right now."
                  : tab === "pending"
                    ? "No pending requests."
                    : "No completed trips yet."}
              </p>
              <Link
                href="/cityrun/send"
                className="mt-4 inline-block text-sm font-semibold text-accent"
              >
                Request a delivery →
              </Link>
            </div>
          )}

          <ul className="space-y-3">
            {filtered.map((order) => (
              <TripDetailCard key={order.id} order={order} />
            ))}
          </ul>
        </main>

        <CityRunBottomNav />
      </div>
    </div>
  );
}

function TripDetailCard({ order }: { order: DeliveryOrder }) {
  const Icon = kindIcons[order.kind];
  const live = isActiveDelivery(order.status);
  const finished = order.status === "delivered" || order.status === "cancelled";

  return (
    <li className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl">
      <Link
        href={`/cityrun/order/${order.id}`}
        className="block px-4 py-4 transition-transform active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/20">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[0.65rem] text-accent">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
              {live && (
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-emerald-300">
                  Live
                </span>
              )}
            </div>
            <p className="cr-text-headline mt-1 text-base font-bold leading-snug">
              {order.itemDescription}
            </p>
            <p
              className={`mt-1.5 text-xs font-semibold ${
                finished && order.status === "cancelled"
                  ? "text-red-300"
                  : "text-accent"
              }`}
            >
              {customerStatusLabels[order.status]}
            </p>
            {order.riderName && (
              <p className="cr-text-muted mt-1 text-xs">Rider: {order.riderName}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
        </div>

        <div className="mt-4 space-y-2.5 rounded-xl bg-white/[0.03] px-3 py-3">
          <DetailLine icon={ArrowUpRight} label="Pickup" value={order.pickup.formatted} />
          <DetailLine icon={ArrowDownRight} label="Dropoff" value={order.dropoff.formatted} />
          <DetailLine label="Contact" value={`${order.contactName} · ${order.contactPhone}`} />
          <DetailLine label="Item size" value={order.itemSize} />
          {order.notes && <DetailLine label="Notes" value={order.notes} />}
          <DetailLine
            label={finished ? "Completed" : "Updated"}
            value={new Date(finished ? order.updatedAt : order.updatedAt).toLocaleString()}
          />
        </div>

        <p className="mt-3 text-center text-xs font-bold text-accent">
          Tap for live map & full tracking →
        </p>
      </Link>
    </li>
  );
}

function DetailLine({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof ArrowUpRight;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2.5">
      {Icon ? (
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.25} />
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="cr-text-muted text-[0.65rem] font-bold uppercase tracking-wide">
          {label}
        </p>
        <p className="cr-text-body mt-0.5 text-xs leading-snug">{value}</p>
      </div>
    </div>
  );
}
