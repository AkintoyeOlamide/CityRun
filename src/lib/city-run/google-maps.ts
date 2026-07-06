import { googleMapsApiKey, hasGoogleMaps } from "@/lib/city-run/config";

export { hasGoogleMaps, googleMapsApiKey };

export type GoogleMap = {
  fitBounds: (bounds: object, padding?: number | object) => void;
  panTo: (pos: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  setCenter: (pos: { lat: number; lng: number }) => void;
};

export type GoogleMarker = {
  setMap: (map: GoogleMap | null) => void;
  setPosition: (pos: { lat: number; lng: number }) => void;
  setIcon: (icon: object) => void;
  setZIndex: (index: number) => void;
};

export type GoogleInfoWindow = {
  open: (map: GoogleMap, marker: GoogleMarker) => void;
  close: () => void;
  setContent: (content: string | Element) => void;
};

export type GooglePolyline = {
  setMap: (map: GoogleMap | null) => void;
  setPath: (path: Array<{ lat: number; lng: number }>) => void;
  setOptions: (opts: object) => void;
};

type GoogleMapsApi = {
  maps: {
    importLibrary?: (name: string) => Promise<unknown>;
    Map: new (el: HTMLElement, opts: object) => GoogleMap;
    Marker: new (opts: object) => GoogleMarker;
    InfoWindow: new (opts?: object) => GoogleInfoWindow;
    Polyline: new (opts: object) => GooglePolyline;
    Size: new (width: number, height: number) => object;
    Point: new (x: number, y: number) => object;
    LatLng: new (lat: number, lng: number) => object;
    LatLngBounds: new () => {
      extend: (pos: { lat: number; lng: number }) => void;
    };
    SymbolPath: { CIRCLE: object; BACKWARD_CLOSED_ARROW: object; FORWARD_CLOSED_ARROW: object };
    event: {
      addListener: (instance: object, event: string, fn: () => void) => object;
      addListenerOnce: (instance: object, event: string, fn: () => void) => object;
      removeListener: (listener: object) => void;
      clearInstanceListeners: (instance: object) => void;
    };
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        opts?: object,
      ) => {
        addListener: (event: string, fn: () => void) => void;
        getPlace: () => {
          formatted_address?: string;
          place_id?: string;
          geometry?: { location?: { lat: () => number; lng: () => number } };
        };
      };
      AutocompleteService: new () => {
        getPlacePredictions: (
          request: object,
          callback: (
            predictions: Array<{ description: string; place_id: string }> | null,
            status: string,
          ) => void,
        ) => void;
      };
      PlacesServiceStatus: { OK: string; ZERO_RESULTS: string };
      PlacesService: new (element: HTMLElement) => {
        getDetails: (
          request: { placeId: string; fields: string[] },
          callback: (
            place: {
              formatted_address?: string;
              place_id?: string;
              geometry?: { location?: { lat: () => number; lng: () => number } };
            } | null,
            status: string,
          ) => void,
        ) => void;
      };
    };
  };
};

type GoogleMapsWindow = Window & {
  google?: GoogleMapsApi;
  gm_authFailure?: () => void;
};

let mapsLoadPromise: Promise<void> | null = null;
let placesLoadPromise: Promise<void> | null = null;
let mapsAuthFailed = false;
let resolvedApiKey: string | null = null;

async function resolveMapsApiKey(): Promise<string> {
  if (resolvedApiKey) return resolvedApiKey;
  if (googleMapsApiKey) {
    resolvedApiKey = googleMapsApiKey;
    return resolvedApiKey;
  }

  try {
    const res = await fetch("/api/cityrun/maps-config", { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as { apiKey?: string | null };
      if (body.apiKey?.trim()) {
        resolvedApiKey = body.apiKey.trim();
        return resolvedApiKey;
      }
    }
  } catch {
    /* runtime fallback below */
  }

  return "";
}

export async function hasGoogleMapsAsync(): Promise<boolean> {
  const key = await resolveMapsApiKey();
  return key.length > 0;
}

function loadMapsUnified(): Promise<void> {
  if (mapsAuthFailed) return Promise.reject(new MapsAuthError());

  const win = window as GoogleMapsWindow;
  if (win.google?.maps?.importLibrary || win.google?.maps?.Map) {
    return Promise.resolve();
  }

  if (!mapsLoadPromise) {
    mapsLoadPromise = resolveMapsApiKey()
      .then((apiKey) => {
        if (!apiKey) {
          throw new Error("Google Maps API key is not configured");
        }
        return loadScript([], "maps", apiKey);
      })
      .catch((error) => {
        mapsLoadPromise = null;
        throw error;
      });
  }

  placesLoadPromise = mapsLoadPromise;
  return mapsLoadPromise;
}

export class MapsAuthError extends Error {
  constructor(message = "Google Maps is not authorized for this site URL.") {
    super(message);
    this.name = "MapsAuthError";
  }
}

export function didMapsAuthFail() {
  return mapsAuthFailed;
}

function resetMapsLoadState() {
  mapsLoadPromise = null;
  placesLoadPromise = null;
  mapsAuthFailed = true;
  document.querySelectorAll('script[data-city-run-maps]').forEach((node) => node.remove());
  delete (window as GoogleMapsWindow).google;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cityrun:maps-auth-failure"));
  }
}

function isGoogleMapsAuthConsoleError(args: unknown[]): boolean {
  const text = args
    .map((value) => (typeof value === "string" ? value : String(value)))
    .join(" ");
  return (
    text.includes("RefererNotAllowedMapError") ||
    text.includes("Google Maps JavaScript API error") ||
    text.includes("InvalidKeyMapError") ||
    text.includes("ApiNotActivatedMapError")
  );
}

/** Google logs auth failures to console.error — Next.js dev overlay treats that as a crash. */
function withSuppressedGoogleMapsConsoleErrors<T>(run: () => Promise<T>): Promise<T> {
  if (typeof window === "undefined") return run();

  const originalError = console.error;
  const onWindowError = (event: ErrorEvent) => {
    if (isGoogleMapsAuthConsoleError([event.message])) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  console.error = (...args: unknown[]) => {
    if (isGoogleMapsAuthConsoleError(args)) return;
    originalError.apply(console, args);
  };
  window.addEventListener("error", onWindowError, true);

  return run().finally(() => {
    console.error = originalError;
    window.removeEventListener("error", onWindowError, true);
  });
}

export function mapsAuthHelpForCurrentOrigin(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  return `Add ${origin}/* to your Google Maps API key HTTP referrers in Google Cloud Console (APIs & Services → Credentials).`;
}

function loadScript(
  libraries: string[],
  datasetValue: string,
  apiKey: string,
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (mapsAuthFailed) return Promise.reject(new MapsAuthError());

  const win = window as GoogleMapsWindow;
  const hasCoreMaps = Boolean(
    win.google?.maps?.importLibrary || win.google?.maps?.Map,
  );

  if (hasCoreMaps) return Promise.resolve();

  return withSuppressedGoogleMapsConsoleErrors(
    () =>
      new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          fn();
        };

        win.gm_authFailure = () => {
          resetMapsLoadState();
          finish(() => reject(new MapsAuthError(mapsAuthHelpForCurrentOrigin())));
        };

        const callbackName = `initCityRunMaps_${datasetValue}_${Date.now()}`;
        (win as Window & Record<string, () => void>)[callbackName] = () => {
          delete (win as Window & Record<string, () => void>)[callbackName];
          finish(resolve);
        };

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=${callbackName}`;
        script.async = true;
        script.dataset.cityRunMaps = datasetValue;
        script.onerror = () => {
          resetMapsLoadState();
          finish(() => reject(new Error("Maps failed to load")));
        };
        document.head.appendChild(script);
      }),
  );
}

export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return loadMapsUnified();
}

export function loadGooglePlacesScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return loadMapsUnified();
}

export function getGoogleMaps(): GoogleMapsApi["maps"] | null {
  if (typeof window === "undefined") return null;
  return (window as GoogleMapsWindow).google?.maps ?? null;
}

/** Dark courier map — subtle roads with readable street names and places. */
const courierMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1a2230" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa8be" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a2230" }, { weight: 2.5 }] },
  { featureType: "administrative.country", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.province", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "on" }] },
  { featureType: "poi.business", elementType: "labels", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#1a2230" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#2a3344" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#323d50" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a465c" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "on" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b8c4d6" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#121820" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
];

export function createDeliveryMap(
  el: HTMLElement,
  center: { lat: number; lng: number },
  zoom = 16,
  options?: { interactive?: boolean },
): GoogleMap {
  const maps = getGoogleMaps()!;
  const interactive = options?.interactive !== false;
  return new maps.Map(el, {
    center,
    zoom,
    disableDefaultUI: true,
    zoomControl: interactive,
    gestureHandling: interactive ? "greedy" : "none",
    draggable: interactive,
    scrollwheel: interactive,
    disableDoubleClickZoom: !interactive,
    clickableIcons: false,
    styles: courierMapStyles,
  });
}

const BIKE_MARKER_URL = "/images/cityrun/rider-bike-marker.svg";

export function riderMarkerIcon(maps: GoogleMapsApi["maps"], size = 36) {
  return {
    url: BIKE_MARKER_URL,
    scaledSize: new maps.Size(size, size),
    anchor: new maps.Point(size / 2, size / 2),
  };
}

/** Custom URL icons require optimized: false on Google Maps markers. */
export const RIDER_MARKER_OPTIONS = {
  optimized: false,
  zIndex: 999,
} as const;

export function routeLineOptions(
  maps: GoogleMapsApi["maps"],
  glow = false,
  simple = false,
  roadPath = false,
) {
  if (glow) {
    return {
      geodesic: !roadPath,
      strokeColor: "#3478F6",
      strokeOpacity: 0.22,
      strokeWeight: simple ? 8 : 12,
      zIndex: 9,
    };
  }

  const base = {
    geodesic: !roadPath,
    strokeColor: "#3478F6",
    strokeOpacity: 0.95,
    strokeWeight: simple ? 3 : 4,
    zIndex: 11,
  };

  if (simple) return base;

  return {
    ...base,
    icons: [
      {
        icon: {
          path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 3,
          strokeColor: "#ffffff",
          strokeOpacity: 0.95,
          fillColor: "#3478F6",
          fillOpacity: 1,
        },
        offset: "50%",
        repeat: "72px",
      },
    ],
  };
}

export function destinationMarkerIcon(
  maps: GoogleMapsApi["maps"],
  color: string,
  scale = 7,
) {
  return {
    path: maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

/** Lagos metro — keeps suggestions relevant for City Run. */
export const lagosLocationBias = {
  lat: 6.5244,
  lng: 3.3792,
  radiusMeters: 45_000,
};
