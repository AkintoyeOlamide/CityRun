import { WALLET_TRIP_PRICE_KOBO } from "@/lib/city-run/wallet-config";
import type { AddressValue } from "@/lib/city-run/types";
import type { ServiceMode } from "@/lib/city-run/service-mode";

/** City Run (bicycle) stays a flat ₦1,000 per trip. */
export const CITY_RUN_FLAT_FARE_KOBO = WALLET_TRIP_PRICE_KOBO;

/** City Run Plus (motorbike) — distance fare. */
export const PLUS_BASE_FARE_KOBO = 800_00;
export const PLUS_PER_KM_KOBO = 250_00;
export const PLUS_MINIMUM_FARE_KOBO = 1_200_00;
const ROAD_DISTANCE_FACTOR = 1.3;

export type FareQuote = {
  fareKobo: number;
  serviceMode: ServiceMode;
  distanceKm?: number;
  pricedByDistance: boolean;
};

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const earthKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

function pointFromAddress(address?: AddressValue): { lat: number; lng: number } | null {
  if (
    address &&
    typeof address.lat === "number" &&
    Number.isFinite(address.lat) &&
    typeof address.lng === "number" &&
    Number.isFinite(address.lng)
  ) {
    return { lat: address.lat, lng: address.lng };
  }
  return null;
}

function roundUpToNearestNaira(kobo: number, stepNaira = 50): number {
  const stepKobo = stepNaira * 100;
  return Math.ceil(kobo / stepKobo) * stepKobo;
}

export function estimatePlusFareKobo(distanceKm: number): number {
  const raw = PLUS_BASE_FARE_KOBO + Math.max(0, distanceKm) * PLUS_PER_KM_KOBO;
  return Math.max(PLUS_MINIMUM_FARE_KOBO, roundUpToNearestNaira(raw));
}

export function estimateDeliveryFareKobo(options?: {
  serviceMode?: ServiceMode | null;
  pickup?: AddressValue;
  dropoff?: AddressValue;
  distanceKm?: number;
}): FareQuote {
  const serviceMode = options?.serviceMode === "cityrun-plus" ? "cityrun-plus" : "cityrun";

  if (serviceMode !== "cityrun-plus") {
    return {
      fareKobo: CITY_RUN_FLAT_FARE_KOBO,
      serviceMode: "cityrun",
      pricedByDistance: false,
    };
  }

  let distanceKm = options?.distanceKm;
  if (distanceKm == null) {
    const from = pointFromAddress(options?.pickup);
    const to = pointFromAddress(options?.dropoff);
    if (from && to) {
      distanceKm = haversineKm(from, to) * ROAD_DISTANCE_FACTOR;
    } else {
      distanceKm = 6;
    }
  }

  return {
    fareKobo: estimatePlusFareKobo(distanceKm),
    serviceMode: "cityrun-plus",
    distanceKm: Math.round(distanceKm * 10) / 10,
    pricedByDistance: true,
  };
}

export function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira);
}

export function parseNairaToKobo(amount: number): number {
  return Math.round(amount * 100);
}
