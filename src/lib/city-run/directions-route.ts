import { getGoogleMaps } from "@/lib/city-run/google-maps";
import type { LatLng } from "@/lib/city-run/map-tracking";
import { distanceMeters } from "@/lib/city-run/rider-geolocation";

const CACHE_TTL_MS = 90_000;
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
  minMoveMeters = 80,
) {
  if (!lastOrigin || !lastDestination) return true;
  if (distanceMeters(lastDestination, destination) > 5) return true;
  return distanceMeters(lastOrigin, origin) >= minMoveMeters;
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

  const maps = getGoogleMaps();
  const google = (window as Window & {
    google?: {
      maps: {
        DirectionsService: new () => DirectionsService;
        TravelMode: { DRIVING: string };
        DirectionsStatus: { OK: string };
      };
    };
  }).google;

  if (!maps || !google?.maps?.DirectionsService) {
    return [origin, destination];
  }

  const service = new google.maps.DirectionsService();

  return new Promise((resolve) => {
    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== google.maps.DirectionsStatus.OK) {
          resolve([origin, destination]);
          return;
        }

        const path = decodeOverviewPath(result);
        if (path.length < 2) {
          resolve([origin, destination]);
          return;
        }

        routeCache.set(cacheKey, { path, fetchedAt: Date.now() });
        resolve(path);
      },
    );
  });
}
