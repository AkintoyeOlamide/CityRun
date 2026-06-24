import type { AddressValue } from "@/lib/city-run/types";
import { distanceMeters } from "@/lib/city-run/rider-geolocation";

const BASE_FARE_KOBO = 800_00; // ₦800
const PER_KM_KOBO = 180_00; // ₦180 per km
const MIN_FARE_KOBO = 1_200_00; // ₦1,200 minimum

const SIZE_MULTIPLIER = {
  small: 1,
  medium: 1.15,
  large: 1.35,
} as const;

export function estimateDeliveryFareKobo(
  pickup: AddressValue,
  dropoff: AddressValue,
  itemSize: keyof typeof SIZE_MULTIPLIER = "medium",
): number {
  let distanceKm = 4;

  if (
    typeof pickup.lat === "number" &&
    typeof pickup.lng === "number" &&
    typeof dropoff.lat === "number" &&
    typeof dropoff.lng === "number"
  ) {
    distanceKm = Math.max(
      1,
      distanceMeters(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: dropoff.lat, lng: dropoff.lng },
      ) / 1000,
    );
  }

  const raw =
    BASE_FARE_KOBO + Math.ceil(distanceKm) * PER_KM_KOBO;
  const sized = Math.round(raw * SIZE_MULTIPLIER[itemSize]);
  return Math.max(MIN_FARE_KOBO, sized);
}

export function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(naira);
}

export function parseNairaToKobo(amount: number): number {
  return Math.round(amount * 100);
}
