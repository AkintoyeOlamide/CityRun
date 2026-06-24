"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import Link from "next/link";
import { Clock, MapPin, Navigation } from "lucide-react";
import { RiderContactCard } from "@/components/city-run/RiderContactCard";
import { formatDistance, formatEtaFromMeters } from "@/lib/city-run/format-distance";
import { getActiveDestination } from "@/lib/city-run/map-tracking";
import { distanceMeters } from "@/lib/city-run/rider-geolocation";
import { customerStatusLabels } from "@/lib/city-run/status-config";
import { useLiveOrderTracking } from "@/lib/city-run/use-live-order-tracking";

const DeliveryMap = dynamic(
  () =>
    import("@/components/city-run/DeliveryMap").then((m) => ({
      default: m.DeliveryMap,
    })),
  { ssr: false, loading: () => <div className="min-h-[12rem] animate-pulse rounded-xl bg-white/5" /> },
);

type CityRunActiveDeliveryCardProps = {
  expanded?: boolean;
  orderId?: string | null;
  loading?: boolean;
};

export function CityRunActiveDeliveryCard({
  expanded = false,
  orderId,
  loading = false,
}: CityRunActiveDeliveryCardProps) {
  const { order } = useLiveOrderTracking(orderId ?? "", Boolean(orderId));

  const mapPoints = useMemo(() => {
    if (!order) return null;

    const pickup =
      order.pickup.lat && order.pickup.lng
        ? { lat: order.pickup.lat, lng: order.pickup.lng }
        : undefined;
    const dropoff =
      order.dropoff.lat && order.dropoff.lng
        ? { lat: order.dropoff.lat, lng: order.dropoff.lng }
        : undefined;

    if (!pickup && !dropoff && !order.riderLocation) return null;

    return { pickup, dropoff };
  }, [order]);

  if (loading || !order) return null;

  const destination = order.riderLocation
    ? getActiveDestination(
        order.status,
        mapPoints?.pickup,
        mapPoints?.dropoff,
      )
    : undefined;

  const distanceMetersValue =
    order.riderLocation && destination
      ? distanceMeters(order.riderLocation, destination)
      : null;

  const distanceLabel = distanceMetersValue
    ? formatDistance(distanceMetersValue)
    : null;

  const etaLabel = distanceMetersValue
    ? formatEtaFromMeters(distanceMetersValue)
    : null;

  const statusBadge = (
    <span className="rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
      {customerStatusLabels[order.status]}
    </span>
  );

  const liveBadge = (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cr-yellow opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cr-yellow" />
      </span>
      {order.riderLocation ? "Live GPS" : "Live delivery"}
    </span>
  );

  return (
    <div className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl">
      <Link
        href={`/cityrun/order/${order.id}`}
        className="block transition-transform active:scale-[0.99]"
      >
        {expanded && mapPoints ? (
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2.5">
              {liveBadge}
              {statusBadge}
            </div>
            <DeliveryMap
              pickup={mapPoints.pickup}
              dropoff={mapPoints.dropoff}
              rider={order.riderLocation}
              status={order.status}
              variant="preview"
              previewSize="tall"
              className="rounded-none border-0"
            />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 p-3 pb-2 sm:p-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cr-yellow opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cr-yellow" />
                </span>
                <span className="cr-text-label text-xs font-bold uppercase tracking-wide">
                  {order.riderLocation ? "Live GPS" : "Live delivery"}
                </span>
              </div>
              <span className="cr-text-label rounded-md bg-white/12 px-2.5 py-1 text-xs font-bold">
                {customerStatusLabels[order.status]}
              </span>
            </div>

            {mapPoints && (
              <div className="pointer-events-none mx-3 mb-2 overflow-hidden rounded-xl sm:mx-4 sm:mb-3">
                <DeliveryMap
                  pickup={mapPoints.pickup}
                  dropoff={mapPoints.dropoff}
                  rider={order.riderLocation}
                  status={order.status}
                  variant="preview"
                  previewSize="default"
                  className="rounded-xl border-0"
                />
              </div>
            )}
          </>
        )}

        <div className={expanded ? "px-3 py-2" : "px-3 pb-3 sm:px-4 sm:pb-4"}>
          <div className="flex items-start justify-between gap-2">
            <p
              className={`cr-text-headline min-w-0 flex-1 font-bold ${
                expanded ? "truncate text-sm" : "text-base"
              }`}
            >
              {order.itemDescription}
            </p>
            {expanded && (distanceLabel || etaLabel) && (
              <div className="flex shrink-0 items-center gap-2 text-[11px] text-white/60">
                {distanceLabel && (
                  <span className="inline-flex items-center gap-1">
                    <Navigation className="h-3 w-3 text-accent" />
                    {distanceLabel}
                  </span>
                )}
                {etaLabel && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-accent" />
                    {etaLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          {!expanded && (distanceLabel || etaLabel) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {distanceLabel && (
                <p className="cr-text-body inline-flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-accent" />
                  {distanceLabel}
                </p>
              )}
              {etaLabel && (
                <p className="cr-text-body inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  ETA {etaLabel}
                </p>
              )}
            </div>
          )}
          {!expanded && (
            <p className="cr-text-body mt-2 flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
              <span className="line-clamp-2">{order.dropoff.formatted}</span>
            </p>
          )}
        </div>
      </Link>

      {order.riderName && (
        <div
          className={
            expanded
              ? "border-t border-white/10 px-3 py-2"
              : "border-t border-white/10 px-3 py-2.5 sm:px-4 sm:py-3"
          }
        >
          <RiderContactCard
            name={order.riderName}
            phone={order.riderPhone}
            compact
          />
        </div>
      )}
    </div>
  );
}
