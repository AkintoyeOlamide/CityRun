"use client";

import { DeliveryMap } from "@/components/city-run/DeliveryMap";
import { LiveTrackingStatus } from "@/components/city-run/LiveTrackingStatus";
import {
  isActiveDelivery,
  mapTrackingStatuses,
} from "@/lib/city-run/status-config";
import type { DeliveryOrder } from "@/lib/city-run/types";

type DeliveryLiveMapSectionProps = {
  order: DeliveryOrder;
  mapClassName?: string;
  titleClassName?: string;
  waitingClassName?: string;
  waitingMessage?: string;
  showTitle?: boolean;
};

const trackingStatuses = new Set(mapTrackingStatuses);

export function DeliveryLiveMapSection({
  order,
  mapClassName = "",
  titleClassName = "cr-text-label text-sm font-bold uppercase tracking-wide",
  waitingClassName = "cr-text-muted text-sm",
  waitingMessage = "Locating your rider… GPS appears as soon as they share location from their phone.",
  showTitle = true,
}: DeliveryLiveMapSectionProps) {
  const isLive = isActiveDelivery(order.status);
  const hasMap = Boolean(
    order.riderLocation ||
      order.pickup.lat ||
      order.dropoff.lat,
  );

  if (!hasMap && !isLive) return null;

  const pickup =
    order.pickup.lat && order.pickup.lng
      ? { lat: order.pickup.lat, lng: order.pickup.lng }
      : undefined;
  const dropoff =
    order.dropoff.lat && order.dropoff.lng
      ? { lat: order.dropoff.lat, lng: order.dropoff.lng }
      : undefined;

  return (
    <section className="space-y-2">
      {showTitle && (
        <div className="flex items-center justify-between px-1">
          <h3 className={titleClassName}>
            {isLive ? "Live tracking" : "Delivery map"}
          </h3>
        </div>
      )}
      {isLive && order.riderLocation && <LiveTrackingStatus order={order} />}
      {hasMap && (
        <DeliveryMap
          pickup={pickup}
          dropoff={dropoff}
          rider={order.riderLocation}
          status={order.status}
          variant={isLive ? "live" : "default"}
          className={mapClassName}
        />
      )}      {trackingStatuses.has(order.status) && !order.riderLocation && (
        <p className={waitingClassName}>{waitingMessage}</p>
      )}
      {isLive && order.riderLocation && !pickup && !dropoff && (
        <p className="cr-text-muted px-1 text-xs">
          Live rider GPS — delivery addresses are shown when map coordinates are available.
        </p>
      )}
    </section>
  );
}
