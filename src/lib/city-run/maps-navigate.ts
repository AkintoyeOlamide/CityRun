import type { AddressValue } from "@/lib/city-run/types";

/** Opens Google Maps directions to an address (prefers lat/lng when available). */
export function buildGoogleMapsNavigateUrl(
  address: AddressValue,
  options?: { travelMode?: "driving" | "bicycling" | "walking" },
): string {
  const travelMode = options?.travelMode ?? "driving";
  const params = new URLSearchParams({ api: "1", travelmode: travelMode });

  if (address.lat != null && address.lng != null) {
    params.set("destination", `${address.lat},${address.lng}`);
  } else if (address.formatted.trim()) {
    params.set("destination", address.formatted.trim());
  } else {
    return "";
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function hasNavigableAddress(address: AddressValue): boolean {
  return (
    (address.lat != null && address.lng != null) || address.formatted.trim().length > 0
  );
}
