import type { DeliveryOrderStatus } from "@/lib/city-run/types";
import { distanceMeters } from "@/lib/city-run/rider-geolocation";

export type LatLng = { lat: number; lng: number };

const TO_PICKUP: DeliveryOrderStatus[] = [
  "rider_assigned",
  "en_route_pickup",
];

const TO_DROPOFF: DeliveryOrderStatus[] = [
  "picked_up",
  "in_transit",
  "arrived_at_dropoff",
];

export function getActiveDestination(
  status: DeliveryOrderStatus,
  pickup?: LatLng,
  dropoff?: LatLng,
): LatLng | undefined {
  if (TO_PICKUP.includes(status)) return pickup;
  if (TO_DROPOFF.includes(status)) return dropoff;
  return dropoff ?? pickup;
}

export function zoomForDistance(meters: number): number {
  if (meters < 250) return 17;
  if (meters < 600) return 16;
  if (meters < 1500) return 15;
  if (meters < 4000) return 14;
  return 13;
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

export function padForMapPoints(points: LatLng[]): number {
  if (points.length === 0) return 0.004;
  if (points.length === 1) return 0.003;
  let maxDist = 0;
  for (let i = 1; i < points.length; i += 1) {
    maxDist = Math.max(maxDist, distanceMeters(points[0], points[i]));
  }
  if (maxDist < 400) return 0.0025;
  if (maxDist < 1200) return 0.004;
  if (maxDist < 3000) return 0.008;
  return 0.015;
}

export function isLiveRiderTracking(
  status: DeliveryOrderStatus,
  rider?: LatLng,
): boolean {
  return Boolean(
    rider &&
      (TO_PICKUP.includes(status) || TO_DROPOFF.includes(status)),
  );
}

export const TRACKING_MIN_ZOOM = 14;
export const TRACKING_MAX_ZOOM = 17;
export const TRACKING_FOLLOW_ZOOM = 17;
