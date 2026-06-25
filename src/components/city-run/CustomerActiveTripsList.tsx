"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  MapPin,
  Navigation,
  Package,
  Send,
  Store,
} from "lucide-react";
import { RiderContactCard } from "@/components/city-run/RiderContactCard";
import { customerStatusLabels, isActiveDelivery } from "@/lib/city-run/status-config";
import type { DeliveryOrder } from "@/lib/city-run/types";

const kindIcons = {
  send: Send,
  receive: Package,
  "store-pickup": Store,
} as const;

type CustomerActiveTripsListProps = {
  orders: DeliveryOrder[];
  title?: string;
  viewAllHref?: string;
  compact?: boolean;
};

export function CustomerActiveTripsList({
  orders,
  title,
  viewAllHref = "/cityrun/trips",
  compact = false,
}: CustomerActiveTripsListProps) {
  if (orders.length === 0) return null;

  const heading =
    title ??
    (orders.length === 1 ? "Active trip" : `Active trips (${orders.length})`);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <h2 className="text-sm font-bold text-white">{heading}</h2>
        </div>
        {orders.length > 1 && viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs font-semibold text-accent"
          >
            View all
          </Link>
        )}
      </div>

      <ul className={`space-y-3 ${compact ? "" : ""}`}>
        {orders.map((order) => (
          <CustomerActiveTripRow key={order.id} order={order} compact={compact} />
        ))}
      </ul>
    </section>
  );
}

function CustomerActiveTripRow({
  order,
  compact,
}: {
  order: DeliveryOrder;
  compact?: boolean;
}) {
  const Icon = kindIcons[order.kind];
  const live = isActiveDelivery(order.status);
  const riderLabel = order.riderName ?? (order.riderId ? "Rider assigned" : null);

  return (
    <li className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl border border-accent/20">
      <Link
        href={`/cityrun/order/${order.id}`}
        className="block transition-transform active:scale-[0.99]"
      >
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20">
                <Icon className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.65rem] text-accent">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  {live && (
                    <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-emerald-300">
                      Live
                    </span>
                  )}
                </div>
                <p className="cr-text-headline mt-1 truncate text-base font-bold">
                  {order.itemDescription}
                </p>
                <p className="mt-1 text-xs font-medium text-accent">
                  {customerStatusLabels[order.status]}
                </p>
              </div>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/35" />
          </div>
        </div>

        {!compact && (
          <div className="space-y-2 px-4 py-3">
            <TripAddressLine
              icon={ArrowUpRight}
              label="Pickup"
              address={order.pickup.formatted}
            />
            <TripAddressLine
              icon={ArrowDownRight}
              label="Dropoff"
              address={order.dropoff.formatted}
            />
          </div>
        )}

        {compact && (
          <p className="cr-text-muted flex items-start gap-1.5 px-4 py-2 text-xs">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">{order.dropoff.formatted}</span>
          </p>
        )}
      </Link>

      {riderLabel && live && (
        <div className="border-t border-white/10 px-4 py-3">
          <RiderContactCard
            name={riderLabel}
            phone={order.riderPhone}
            compact
          />
        </div>
      )}

      <div className="border-t border-white/10 px-4 py-3">
        <Link
          href={`/cityrun/order/${order.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
        >
          <Navigation className="h-4 w-4" />
          {live && order.riderLocation ? "View rider on map" : "View full details"}
        </Link>
      </div>
    </li>
  );
}

function TripAddressLine({
  icon: Icon,
  label,
  address,
}: {
  icon: typeof MapPin;
  label: string;
  address: string;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.25} />
      <div className="min-w-0">
        <p className="cr-text-muted text-[0.65rem] font-bold uppercase tracking-wide">
          {label}
        </p>
        <p className="cr-text-body mt-0.5 text-xs leading-snug">{address}</p>
      </div>
    </div>
  );
}