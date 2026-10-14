"use client";

import { useEffect, useState } from "react";
import { Navigation, Radio } from "lucide-react";
import { formatDistance, formatEtaFromMeters, formatSecondsAgo } from "@/lib/city-run/format-distance";
import { getActiveDestination } from "@/lib/city-run/map-tracking";
import { distanceMeters } from "@/lib/city-run/rider-geolocation";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import type { DeliveryOrder } from "@/lib/city-run/types";

type LiveTrackingStatusProps = {
  order: DeliveryOrder;
};

export function LiveTrackingStatus({ order }: LiveTrackingStatusProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!order.riderLocation || !isActiveDelivery(order.status)) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [order.riderLocation, order.status, order.updatedAt]);

  if (!order.riderLocation || !isActiveDelivery(order.status)) return null;

  const destination = getActiveDestination(
    order.status,
    order.pickup.lat && order.pickup.lng
      ? { lat: order.pickup.lat, lng: order.pickup.lng }
      : undefined,
    order.dropoff.lat && order.dropoff.lng
      ? { lat: order.dropoff.lat, lng: order.dropoff.lng }
      : undefined,
  );

  const heading =
    order.status === "rider_assigned" || order.status === "en_route_pickup"
      ? "Heading to pickup"
      : "Heading to Destination";

  const distanceLabel = destination
    ? formatDistance(distanceMeters(order.riderLocation, destination))
    : null;

  const etaLabel = destination
    ? formatEtaFromMeters(distanceMeters(order.riderLocation, destination))
    : null;

  const age = Math.max(
    0,
    Math.floor((now - new Date(order.updatedAt).getTime()) / 1000),
  );
  const fresh = age <= 20;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        fresh
          ? "border-accent/35 bg-accent/10"
          : "border-white/12 bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {fresh ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
            ) : (
              <Radio className="h-3.5 w-3.5 shrink-0 text-white/50" />
            )}
            <p className="cr-text-label text-xs font-bold uppercase tracking-wide">
              {fresh ? "Live GPS" : "GPS signal"}
            </p>
          </div>
          <p className="cr-text-headline mt-1.5 text-base font-bold">{heading}</p>
          {distanceLabel && (
            <p className="cr-text-body mt-0.5 flex items-center gap-1.5 text-sm">
              <Navigation className="h-3.5 w-3.5 text-accent" />
              Rider is {distanceLabel}
              {etaLabel && (
                <span className="cr-text-muted">· ETA {etaLabel}</span>
              )}
            </p>
          )}
          {order.riderName && (
            <p className="cr-text-muted mt-1 text-xs">{order.riderName} is on the move</p>
          )}
        </div>
        <p className="cr-text-muted shrink-0 text-[0.65rem]">
          {formatSecondsAgo(age)}
        </p>
      </div>
    </div>
  );
}
