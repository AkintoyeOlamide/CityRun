import {
  isGeolocationSupported,
  requestRiderGeolocation,
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
      return "Location took too long. Please try again.";
    }
  }

  if (error instanceof Error) return error.message;
  return "Could not get your location.";
}

export async function resolveAddressFromCurrentLocation(): Promise<AddressValue> {
  if (!isGeolocationSupported()) {
    throw new Error("Location is not supported on this device.");
  }

  const position = await requestRiderGeolocation();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  const res = await fetch(
    `/api/cityrun/places/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
  );

  if (res.ok) {
    return (await res.json()) as AddressValue;
  }

  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new Error(body?.error ?? "Could not look up your address.");
}

export { geolocationErrorMessage };
