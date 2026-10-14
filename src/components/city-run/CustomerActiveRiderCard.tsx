"use client";

import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";
import { RiderContactCard } from "@/components/city-run/RiderContactCard";
import { customerStatusLabels, isActiveDelivery } from "@/lib/city-run/status-config";
import type { DeliveryOrder } from "@/lib/city-run/types";

type CustomerActiveRiderCardProps = {
  order: DeliveryOrder;
};

export function CustomerActiveRiderCard({ order }: CustomerActiveRiderCardProps) {
  const riderLabel = order.riderName ?? "Your rider";
  if (!isActiveDelivery(order.status) || (!order.riderName && !order.riderId)) {
    return null;
  }

  return (
    <div className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl border border-accent/25 bg-accent/5">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            Live delivery
          </p>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            {customerStatusLabels[order.status]}
          </span>
        </div>
        <p className="cr-text-headline mt-2 truncate text-base font-bold">
          {order.itemDescription}
        </p>
        <p className="cr-text-muted mt-1 flex items-start gap-1.5 text-xs">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{order.dropoff.formatted}</span>
        </p>
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <RiderContactCard
          name={riderLabel}
          phone={order.riderPhone}
          compact
        />
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <Link
          href={`/cityrun/order/${order.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
        >
          <Navigation className="h-4 w-4" />
          View rider on map
        </Link>
      </div>
    </div>
  );
}

export function pickPrimaryActiveOrder(
  orders: DeliveryOrder[],
): DeliveryOrder | undefined {
  return orders.find(
    (order) =>
      isActiveDelivery(order.status) &&
      Boolean(order.riderName || order.riderId),
  );
}
