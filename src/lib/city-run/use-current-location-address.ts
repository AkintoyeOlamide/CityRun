import {
  isGeolocationSupported,
  requestCustomerGeolocation,
} from "@/lib/city-run/rider-geolocation";
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

export async function resolveAddressFromCurrentLocation(): Promise<AddressValue> {
  if (!isGeolocationSupported()) {
    throw new Error("Location is not supported on this device.");
  }

  const position = await requestCustomerGeolocation();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(
      `/api/cityrun/places/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
      { signal: controller.signal },
    );

    if (res.ok) {
      return (await res.json()) as AddressValue;
    }

    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not look up your address.");
  } finally {
    window.clearTimeout(timeout);
  }
}

export { geolocationErrorMessage };
