import { getGoogleMaps } from "@/lib/city-run/google-maps";
import type { LatLng } from "@/lib/city-run/map-tracking";
import { distanceMeters } from "@/lib/city-run/rider-geolocation";

const CACHE_TTL_MS = 60_000;
const routeCache = new Map<string, { path: LatLng[]; fetchedAt: number }>();

type DirectionsResult = {
  routes: Array<{
    overview_path: Array<{ lat: () => number; lng: () => number }>;
  }>;
};

type DirectionsService = {
  route: (
    request: {
      origin: LatLng;
      destination: LatLng;
      travelMode: string;
    },
    callback: (result: DirectionsResult | null, status: string) => void,
  ) => void;
};

function routeCacheKey(origin: LatLng, destination: LatLng) {
  const round = (value: number) => value.toFixed(4);
  return `${round(origin.lat)},${round(origin.lng)}->${round(destination.lat)},${round(destination.lng)}`;
}

function decodeOverviewPath(result: DirectionsResult | null): LatLng[] {
  const overview = result?.routes[0]?.overview_path;
  if (!overview?.length) return [];
  return overview.map((point) => ({ lat: point.lat(), lng: point.lng() }));
}

export function shouldRefetchDrivingRoute(
  lastOrigin: LatLng | null,
  lastDestination: LatLng | null,
  origin: LatLng,
  destination: LatLng,
  minMoveMeters = 45,
) {
  if (!lastOrigin || !lastDestination) return true;
  if (distanceMeters(lastDestination, destination) > 5) return true;
  return distanceMeters(lastOrigin, origin) >= minMoveMeters;
}

/** Snap remaining route to rider — line starts at bike, follows roads ahead. */
export function trimRouteFromRider(path: LatLng[], rider: LatLng): LatLng[] {
  if (path.length < 2) return path;

  let nearestIdx = 0;
  let nearestDist = Infinity;

  for (let i = 0; i < path.length; i += 1) {
    const dist = distanceMeters(path[i], rider);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestIdx = i;
    }
  }

  const ahead = path.slice(nearestIdx + 1);
  if (ahead.length === 0) {
    return [rider, path[path.length - 1]];
  }

  return [rider, ...ahead];
}

async function fetchDrivingRouteFromApi(
  origin: LatLng,
  destination: LatLng,
): Promise<LatLng[]> {
  try {
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
    });
    const res = await fetch(`/api/cityrun/directions?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { path?: LatLng[] };
    return body.path?.length && body.path.length >= 2 ? body.path : [];
  } catch {
    return [];
  }
}

async function fetchDrivingRouteClient(
  origin: LatLng,
  destination: LatLng,
): Promise<LatLng[]> {
  const maps = getGoogleMaps();
  const google = (window as Window & {
    google?: {
      maps: {
        DirectionsService: new () => DirectionsService;
        TravelMode: { DRIVING: string; BICYCLING: string };
        DirectionsStatus: { OK: string };
      };
    };
  }).google;

  if (!maps || !google?.maps?.DirectionsService) return [];

  const service = new google.maps.DirectionsService();
  const modes = [
    google.maps.TravelMode.BICYCLING,
    google.maps.TravelMode.DRIVING,
  ];

  for (const travelMode of modes) {
    const path = await new Promise<LatLng[]>((resolve) => {
      service.route({ origin, destination, travelMode }, (result, status) => {
        if (status !== google.maps!.DirectionsStatus.OK) {
          resolve([]);
          return;
        }
        const decoded = decodeOverviewPath(result);
        resolve(decoded.length >= 2 ? decoded : []);
      });
    });
    if (path.length >= 2) return path;
  }

  return [];
}

export async function fetchDrivingRoute(
  origin: LatLng,
  destination: LatLng,
): Promise<LatLng[]> {
  const cacheKey = routeCacheKey(origin, destination);
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.path;
  }

  let path = await fetchDrivingRouteFromApi(origin, destination);
  if (path.length < 2) {
    path = await fetchDrivingRouteClient(origin, destination);
  }
  if (path.length < 2) {
    path = [origin, destination];
  }

  routeCache.set(cacheKey, { path, fetchedAt: Date.now() });
  return path;
}

export function buildDisplayRoutePath(
  basePath: LatLng[] | null,
  rider: LatLng | undefined,
  destination: LatLng | undefined,
): LatLng[] {
  if (!rider || !destination) return [];

  if (basePath && basePath.length >= 2) {
    return trimRouteFromRider(basePath, rider);
  }

  return [rider, destination];
}
