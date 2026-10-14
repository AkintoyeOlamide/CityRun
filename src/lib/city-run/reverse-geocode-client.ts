import {
  getGoogleMaps,
  loadGoogleMapsScript,
} from "@/lib/city-run/google-maps";
import type { AddressValue } from "@/lib/city-run/types";

export async function reverseGeocodeClient(
  lat: number,
  lng: number,
): Promise<AddressValue | null> {
  try {
    await loadGoogleMapsScript();
  } catch {
    return null;
  }

  const maps = getGoogleMaps();
  if (!maps?.Geocoder) return null;

  return new Promise((resolve) => {
    const geocoder = new maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      const ok = maps.GeocoderStatus?.OK ?? "OK";
      const result = results?.[0];
      if (status !== ok || !result?.formatted_address) {
        resolve(null);
        return;
      }

      resolve({
        formatted: result.formatted_address,
        placeId: result.place_id,
        lat: result.geometry?.location?.lat() ?? lat,
        lng: result.geometry?.location?.lng() ?? lng,
      });
    });
  });
}
