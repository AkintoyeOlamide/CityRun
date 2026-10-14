import { clearRiderLocationDeclined } from "@/lib/city-run/consent-preferences";

export type RiderLocationConsent = "unknown" | "granted" | "denied";

const CONSENT_KEY = "cityrun:rider-location-consent";

export function getRiderLocationConsent(): RiderLocationConsent {
  if (typeof window === "undefined") return "unknown";
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === "granted" || value === "denied") return value;
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function setRiderLocationConsent(consent: Exclude<RiderLocationConsent, "unknown">) {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
    if (consent === "granted") clearRiderLocationDeclined();
  } catch {
    /* ignore */
  }
}

export function clearRiderLocationConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* ignore */
  }
}

export function isGeolocationSupported() {
  return typeof window !== "undefined" && "geolocation" in navigator;
}

export function requestRiderGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30_000,
    });
  });
}

/** Faster pickup for customers — cached/network first, then GPS. */
export function requestCustomerGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }

    const tryGet = (options: PositionOptions) =>
      new Promise<GeolocationPosition>((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, options);
      });

    let settled = false;
    let watchId: number | undefined;

    const finishFast = (position: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      resolve(position);
    };

    const fastOptions: PositionOptions = {
      enableHighAccuracy: false,
      maximumAge: 600_000,
      timeout: 2_000,
    };

    watchId = navigator.geolocation.watchPosition(finishFast, () => {}, fastOptions);
    navigator.geolocation.getCurrentPosition(finishFast, () => {}, fastOptions);

    window.setTimeout(() => {
      if (settled) return;
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);

      void tryGet({ enableHighAccuracy: false, maximumAge: 180_000, timeout: 3_500 })
        .then(resolve)
        .catch(() =>
          tryGet({ enableHighAccuracy: true, maximumAge: 60_000, timeout: 7_000 })
            .then(resolve)
            .catch(() =>
              tryGet({
                enableHighAccuracy: false,
                maximumAge: 600_000,
                timeout: 4_000,
              }).then(resolve, reject),
            ),
        );
    }, 2_200);
  });
}

let customerCoordinatesWarmup: Promise<GeolocationPosition> | null = null;

/** Start GPS lookup early (e.g. when the send form mounts). */
export function warmCustomerCoordinates(): Promise<GeolocationPosition> {
  if (!customerCoordinatesWarmup) {
    customerCoordinatesWarmup = requestCustomerGeolocation();
  }
  return customerCoordinatesWarmup;
}

export function clearCustomerCoordinatesWarmup() {
  customerCoordinatesWarmup = null;
}

export async function enableRiderLocationTracking(): Promise<GeolocationPosition> {
  const position = await requestRiderGeolocation();
  setRiderLocationConsent("granted");
  return position;
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

export type RiderGpsReading = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type RiderGpsSendContext = {
  previous: { lat: number; lng: number } | null;
  lastSentAt: number;
  lastAccuracy: number | null;
};

const GOOD_ACCURACY_M = 45;
const OK_ACCURACY_M = 90;
const POOR_ACCURACY_M = 160;

/** Prefer fresh satellite GPS and ignore coarse network jumps. */
export function shouldSendRiderGps(
  reading: RiderGpsReading,
  context: RiderGpsSendContext,
): boolean {
  const { accuracy, lat, lng } = reading;
  const { previous, lastSentAt, lastAccuracy } = context;
  const now = Date.now();
  const waitedLongEnough = now - lastSentAt >= 3_000;

  if (accuracy > POOR_ACCURACY_M) {
    return !previous && now - lastSentAt >= 30_000;
  }

  if (accuracy <= GOOD_ACCURACY_M) {
    if (!previous) return true;
    const moved =
      distanceMeters(previous, { lat, lng }) >= (accuracy <= 20 ? 3 : 5);
    return moved || waitedLongEnough;
  }

  if (!previous) return accuracy <= OK_ACCURACY_M;

  const improved =
    lastAccuracy === null || accuracy < lastAccuracy * 0.7;
  if (improved) return true;

  if (
    lastAccuracy !== null &&
    accuracy > lastAccuracy + 25 &&
    now - lastSentAt < 45_000
  ) {
    return false;
  }

  const moved = distanceMeters(previous, { lat, lng }) >= 10;
  return moved && waitedLongEnough && accuracy <= OK_ACCURACY_M;
}

export const riderGeolocationWatchOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 30_000,
};

export const riderGeolocationRefreshOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 25_000,
};
