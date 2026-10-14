import {
  clearCustomerCoordinatesWarmup,
  isGeolocationSupported,
  warmCustomerCoordinates,
} from "@/lib/city-run/rider-geolocation";
import { reverseGeocodeClient } from "@/lib/city-run/reverse-geocode-client";
import type { AddressValue } from "@/lib/city-run/types";

function geolocationErrorMessage(error: unknown): string {
  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return "Location access was blocked. Allow location for this site in your browser settings, then try again.";
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return "Could not detect your location. Try moving outdoors or entering the address manually.";
    }
    if (error.code === error.TIMEOUT) {
      return "Location took too long. Please try again or enter your address manually.";
    }
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "Address lookup took too long. Please try again or enter your address manually.";
    }
    return error.message;
  }

  return "Could not get your location.";
}

async function fetchServerReverseGeocode(
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<AddressValue | null> {
  const res = await fetch(
    `/api/cityrun/places/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    { signal },
  );

  if (!res.ok) return null;
  return (await res.json()) as AddressValue;
}

function coordinatesFallback(lat: number, lng: number): AddressValue {
  return {
    formatted: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  };
}

/** Kick off GPS lookup before the user taps anything. */
export function warmCurrentLocationLookup() {
  if (!isGeolocationSupported()) return;
  void warmCustomerCoordinates();
}

export async function resolveAddressFromCoordinates(
  lat: number,
  lng: number,
): Promise<AddressValue> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5_000);

  const lookups: Promise<AddressValue | null>[] = [
    reverseGeocodeClient(lat, lng),
    fetchServerReverseGeocode(lat, lng, controller.signal),
  ];

  try {
    const results = await Promise.allSettled(lookups);
    for (const result of results) {
      if (result.status === "fulfilled" && result.value?.formatted?.trim()) {
        return result.value;
      }
    }
    return coordinatesFallback(lat, lng);
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function resolveAddressFromCurrentLocation(): Promise<AddressValue> {
  if (!isGeolocationSupported()) {
    throw new Error("Location is not supported on this device.");
  }

  try {
    const position = await warmCustomerCoordinates();
    return resolveAddressFromCoordinates(
      position.coords.latitude,
      position.coords.longitude,
    );
  } catch (error) {
    clearCustomerCoordinatesWarmup();
    throw error;
  }
}

export { geolocationErrorMessage };
