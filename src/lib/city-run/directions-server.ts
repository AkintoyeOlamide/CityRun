import type { LatLng } from "@/lib/city-run/map-tracking";

function readMapsKey() {
  return (
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

/** Decode Google encoded polyline (Directions API overview_polyline). */
export function decodeGooglePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

export async function fetchDrivingRouteServer(
  origin: LatLng,
  destination: LatLng,
): Promise<LatLng[]> {
  const key = readMapsKey();
  if (!key) return [];

  const originParam = `${origin.lat},${origin.lng}`;
  const destParam = `${destination.lat},${destination.lng}`;

  for (const mode of ["bicycling", "driving"] as const) {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", originParam);
    url.searchParams.set("destination", destParam);
    url.searchParams.set("mode", mode);
    url.searchParams.set("key", key);
    url.searchParams.set("region", "ng");

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as {
      status?: string;
      routes?: Array<{ overview_polyline?: { points?: string } }>;
    };

    if (data.status !== "OK") continue;

    const encoded = data.routes?.[0]?.overview_polyline?.points;
    if (!encoded) continue;

    const path = decodeGooglePolyline(encoded);
    if (path.length >= 2) return path;
  }

  return [];
}
