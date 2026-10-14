import type { AddressValue } from "@/lib/city-run/types";
import {
  isServerMapsKeyConfigured,
  readServerMapsApiKey,
} from "@/lib/city-run/maps-config-server";
import {
  filterNominatimPredictions,
  lagosLocationBiasMeters,
  lagosMetroCenter,
  lagosMetroRestriction,
} from "@/lib/city-run/places-autocomplete-utils";

export type PlacePrediction = {
  description: string;
  placeId: string;
  lat?: number;
  lng?: number;
};

export type AutocompleteResult = {
  predictions: PlacePrediction[];
  source: "google" | "nominatim" | "none";
};

const lagosLocationBias = {
  lat: lagosMetroCenter.lat,
  lng: lagosMetroCenter.lng,
  radiusMeters: lagosLocationBiasMeters,
};

function warnPlacesFailure(label: string, detail: string) {
  if (process.env.NODE_ENV === "production") return;
  console.warn(`[CityRun] ${label}: ${detail}`);
}

function readMapsKey() {
  return readServerMapsApiKey();
}

const OSM_HEADERS = {
  "User-Agent": "CityRun/1.0 (citygateshl.org; info@citygateshl.com)",
  Accept: "application/json",
} as const;

const GOOGLE_TIMEOUT_MS = 1800;
const OSM_TIMEOUT_MS = 6000;
const GOOGLE_COOLDOWN_MS = 10 * 60 * 1000;

let googleDisabledUntil = 0;
const autocompleteCache = new Map<string, { at: number; result: AutocompleteResult }>();

function disableGoogle(reason: string) {
  googleDisabledUntil = Date.now() + GOOGLE_COOLDOWN_MS;
  warnPlacesFailure("Google Places disabled", reason);
}

function shouldTryGoogle() {
  return isServerMapsKeyConfigured() && Date.now() >= googleDisabledUntil;
}

function isGoogleBlockedStatus(status: number, body: string) {
  return (
    status === 403 ||
    status === 401 ||
    /REQUEST_DENIED|API_KEY_ANDROID_APP_BLOCKED|RefererNotAllowed|API_KEY_HTTP_REFERRER_BLOCKED/i.test(
      body,
    )
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

function googleAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = readMapsKey();
  const referer =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.citygateshl.org";

  return {
    "X-Goog-Api-Key": key,
    Referer: referer.endsWith("/") ? referer : `${referer}/`,
    ...extra,
  };
}

function googleBrowserHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = readMapsKey();
  const referer =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.citygateshl.org";
  return {
    "X-Goog-Api-Key": key,
    Referer: referer.endsWith("/") ? referer : `${referer}/`,
    Origin: referer.replace(/\/$/, ""),
    ...extra,
  };
}

function hasCoords(lat?: number, lng?: number) {
  return typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);
}

function isOsmPlaceId(placeId: string) {
  return (
    placeId.startsWith("nominatim:") ||
    placeId.startsWith("photon:") ||
    placeId.startsWith("osm:")
  );
}

async function fetchPlacesAutocomplete(
  input: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetchWithTimeout(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        input,
        languageCode: "en",
        regionCode: "NG",
        includedRegionCodes: ["NG"],
        locationBias: {
          circle: {
            center: {
              latitude: lagosMetroCenter.lat,
              longitude: lagosMetroCenter.lng,
            },
            radius: lagosLocationBias.radiusMeters,
          },
        },
        origin: {
          latitude: lagosMetroCenter.lat,
          longitude: lagosMetroCenter.lng,
        },
      }),
    },
    GOOGLE_TIMEOUT_MS,
  );
  return { ok: res.ok, status: res.status, body: await res.text() };
}

function parseGoogleAutocomplete(raw: string): PlacePrediction[] {
  const data = JSON.parse(raw) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        place?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };

  const predictions: PlacePrediction[] = [];
  for (const suggestion of data.suggestions ?? []) {
    const prediction = suggestion.placePrediction;
    if (!prediction) continue;
    const placeId =
      prediction.placeId?.trim() ||
      prediction.place?.replace(/^places\//, "").trim() ||
      "";
    if (!placeId) continue;
    const description =
      prediction.text?.text?.trim() ||
      [prediction.structuredFormat?.mainText?.text, prediction.structuredFormat?.secondaryText?.text]
        .filter(Boolean)
        .join(", ");
    if (!description) continue;
    predictions.push({ description, placeId });
  }
  return predictions;
}

async function googleAutocompleteNew(input: string): Promise<PlacePrediction[] | null> {
  if (!shouldTryGoogle()) return null;

  const attempts = [
    googleBrowserHeaders({ "Content-Type": "application/json" }),
    googleAuthHeaders({ "Content-Type": "application/json" }),
  ];

  for (const headers of attempts) {
    try {
      const res = await fetchPlacesAutocomplete(input, headers);
      if (res.ok) return parseGoogleAutocomplete(res.body);
      if (isGoogleBlockedStatus(res.status, res.body)) {
        disableGoogle(`${res.status} ${res.body.slice(0, 180)}`);
        return null;
      }
      warnPlacesFailure("Places autocomplete (new)", `${res.status} ${res.body}`);
    } catch (error) {
      warnPlacesFailure(
        "Places autocomplete (new)",
        error instanceof Error ? error.message : "timeout",
      );
    }
  }

  return null;
}

async function googleAutocompleteLegacy(input: string): Promise<PlacePrediction[] | null> {
  if (!shouldTryGoogle()) return null;
  const key = readMapsKey();
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("key", key);
  url.searchParams.set("components", "country:ng");
  url.searchParams.set("location", `${lagosLocationBias.lat},${lagosLocationBias.lng}`);
  url.searchParams.set("radius", String(lagosLocationBias.radiusMeters));
  url.searchParams.set("strictbounds", "false");
  url.searchParams.set("language", "en");

  let res: Response;
  try {
    res = await fetchWithTimeout(url.toString(), { headers: googleAuthHeaders() }, GOOGLE_TIMEOUT_MS);
  } catch (error) {
    warnPlacesFailure(
      "Places autocomplete (legacy)",
      error instanceof Error ? error.message : "timeout",
    );
    return null;
  }

  const data = (await res.json()) as {
    status?: string;
    predictions?: Array<{ description: string; place_id: string }>;
    error_message?: string;
  };

  if (data.status === "OK" || data.status === "ZERO_RESULTS") {
    return (data.predictions ?? []).map((prediction) => ({
      description: prediction.description,
      placeId: prediction.place_id,
    }));
  }

  const detail = `${data.status ?? "unknown"} ${data.error_message ?? ""}`.trim();
  if (isGoogleBlockedStatus(res.status, detail)) {
    disableGoogle(detail);
    return null;
  }

  warnPlacesFailure("Places autocomplete (legacy)", detail);
  return null;
}

async function googlePlaceDetailsNew(placeId: string): Promise<AddressValue | null> {
  if (!shouldTryGoogle()) return null;
  const key = readMapsKey();
  if (!key) return null;

  const id = placeId.replace(/^places\//, "");
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
      {
        headers: googleAuthHeaders({
          "X-Goog-FieldMask": "id,formattedAddress,location",
        }),
      },
      GOOGLE_TIMEOUT_MS,
    );
  } catch (error) {
    warnPlacesFailure(
      "Place details (new)",
      error instanceof Error ? error.message : "timeout",
    );
    return null;
  }

  if (!res.ok) {
    const body = await res.text();
    if (isGoogleBlockedStatus(res.status, body)) disableGoogle(body.slice(0, 180));
    warnPlacesFailure("Place details (new)", `${res.status} ${body}`);
    return null;
  }

  const data = (await res.json()) as {
    id?: string;
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  };

  if (!data.formattedAddress) return null;

  return {
    formatted: data.formattedAddress,
    placeId: data.id?.replace(/^places\//, "") || id,
    lat: data.location?.latitude,
    lng: data.location?.longitude,
  };
}

async function googlePlaceDetails(placeId: string): Promise<AddressValue | null> {
  if (!shouldTryGoogle()) return null;
  const key = readMapsKey();
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", key);
  url.searchParams.set("fields", "formatted_address,geometry,place_id");

  let res: Response;
  try {
    res = await fetchWithTimeout(url.toString(), { headers: googleAuthHeaders() }, GOOGLE_TIMEOUT_MS);
  } catch (error) {
    warnPlacesFailure(
      "Place details (legacy)",
      error instanceof Error ? error.message : "timeout",
    );
    return null;
  }

  const data = (await res.json()) as {
    status?: string;
    result?: {
      formatted_address?: string;
      place_id?: string;
      geometry?: { location?: { lat: number; lng: number } };
    };
    error_message?: string;
  };

  if (data.status === "REQUEST_DENIED") {
    disableGoogle(data.error_message ?? data.status);
    return null;
  }

  if (data.status !== "OK" || !data.result?.formatted_address) {
    return null;
  }

  return {
    formatted: data.result.formatted_address,
    placeId: data.result.place_id,
    lat: data.result.geometry?.location?.lat,
    lng: data.result.geometry?.location?.lng,
  };
}

function uniquePredictions(predictions: PlacePrediction[]) {
  const seen = new Set<string>();
  const next: PlacePrediction[] = [];
  for (const prediction of predictions) {
    const key = `${prediction.placeId}:${prediction.description.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(prediction);
  }
  return next;
}

function formatPhotonDescription(props: {
  name?: string;
  housenumber?: string;
  street?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
}) {
  const parts: string[] = [];
  const street =
    props.housenumber && props.street
      ? `${props.housenumber} ${props.street}`
      : props.street;
  if (props.name) parts.push(props.name);
  if (street && street.toLowerCase() !== props.name?.toLowerCase()) parts.push(street);
  const locality = props.district || props.city || props.county;
  if (locality && !parts.some((part) => part.toLowerCase() === locality.toLowerCase())) {
    parts.push(locality);
  }
  if (props.state) parts.push(props.state);
  if (props.country) parts.push(props.country);
  return parts.join(", ");
}

async function photonSearch(query: string): Promise<PlacePrediction[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("lat", String(lagosMetroCenter.lat));
  url.searchParams.set("lon", String(lagosMetroCenter.lng));
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "en");

  const res = await fetchWithTimeout(url.toString(), { headers: OSM_HEADERS }, OSM_TIMEOUT_MS);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        osm_type?: string;
        osm_id?: number;
        name?: string;
        housenumber?: string;
        street?: string;
        district?: string;
        city?: string;
        county?: string;
        state?: string;
        country?: string;
        countrycode?: string;
      };
    }>;
  };

  const predictions: PlacePrediction[] = [];
  for (const feature of data.features ?? []) {
    const props = feature.properties;
    const coords = feature.geometry?.coordinates;
    if (!props || !coords || coords.length < 2) continue;
    if (props.countrycode && props.countrycode.toUpperCase() !== "NG") continue;

    const [lng, lat] = coords;
    if (
      lat < lagosMetroRestriction.south - 0.4 ||
      lat > lagosMetroRestriction.north + 0.4 ||
      lng < lagosMetroRestriction.west - 0.4 ||
      lng > lagosMetroRestriction.east + 0.4
    ) {
      continue;
    }

    const description = formatPhotonDescription(props);
    if (!description) continue;

    predictions.push({
      description,
      placeId: `osm:${props.osm_type ?? "N"}${props.osm_id ?? description}`,
      lat,
      lng,
    });
  }

  return predictions;
}

async function nominatimSearch(query: string): Promise<PlacePrediction[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ng");
  url.searchParams.set("limit", "6");
  url.searchParams.set(
    "viewbox",
    `${lagosMetroRestriction.west},${lagosMetroRestriction.north},${lagosMetroRestriction.east},${lagosMetroRestriction.south}`,
  );
  url.searchParams.set("bounded", "0");

  const res = await fetchWithTimeout(url.toString(), { headers: OSM_HEADERS }, OSM_TIMEOUT_MS);
  if (!res.ok) return [];

  const rows = (await res.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
  }>;

  return rows.map((row) => ({
    description: row.display_name,
    placeId: `nominatim:${row.place_id}`,
    lat: Number.parseFloat(row.lat),
    lng: Number.parseFloat(row.lon),
  }));
}

async function osmAutocomplete(input: string): Promise<PlacePrediction[]> {
  const queries = [input];
  if (!/\blagos\b/i.test(input)) {
    queries.push(`${input}, Lagos, Nigeria`);
  }

  const photonResults = await Promise.all(queries.map((query) => photonSearch(query).catch(() => [])));
  const photon = filterNominatimPredictions(input, uniquePredictions(photonResults.flat()));
  if (photon.length > 0) return photon;

  const nominatimResults = await Promise.all(
    queries.map((query) => nominatimSearch(query).catch(() => [])),
  );
  return filterNominatimPredictions(input, uniquePredictions(nominatimResults.flat()));
}

export async function autocompletePlaces(input: string): Promise<AutocompleteResult> {
  const trimmed = input.trim();
  if (trimmed.length < 3) {
    return { predictions: [], source: "none" };
  }

  const cached = autocompleteCache.get(trimmed.toLowerCase());
  if (cached && Date.now() - cached.at < 45_000) {
    return cached.result;
  }

  const osmPromise = osmAutocomplete(trimmed);

  if (shouldTryGoogle()) {
    const googleNew = await googleAutocompleteNew(trimmed);
    if (googleNew !== null && googleNew.length > 0) {
      const result: AutocompleteResult = { predictions: googleNew, source: "google" };
      autocompleteCache.set(trimmed.toLowerCase(), { at: Date.now(), result });
      return result;
    }

    const googleLegacy = await googleAutocompleteLegacy(trimmed);
    if (googleLegacy !== null && googleLegacy.length > 0) {
      const result: AutocompleteResult = { predictions: googleLegacy, source: "google" };
      autocompleteCache.set(trimmed.toLowerCase(), { at: Date.now(), result });
      return result;
    }
  }

  const nominatim = await osmPromise;
  const result: AutocompleteResult = nominatim.length > 0
    ? { predictions: nominatim, source: "nominatim" }
    : { predictions: [], source: "none" };
  autocompleteCache.set(trimmed.toLowerCase(), { at: Date.now(), result });
  return result;
}

export async function resolvePlace(
  placeId: string,
  description?: string,
  lat?: number,
  lng?: number,
): Promise<AddressValue> {
  if (hasCoords(lat, lng) && (description || isOsmPlaceId(placeId))) {
    return {
      formatted: description?.trim() || `${lat!.toFixed(6)}, ${lng!.toFixed(6)}`,
      placeId,
      lat,
      lng,
    };
  }

  if (isOsmPlaceId(placeId) && description?.trim()) {
    const matches = await osmAutocomplete(description.trim()).catch(() => []);
    const match = matches[0];
    if (match) {
      return {
        formatted: match.description || description,
        placeId: match.placeId || placeId,
        lat: match.lat ?? lat,
        lng: match.lng ?? lng,
      };
    }
  }

  if (!isOsmPlaceId(placeId)) {
    const googleNew = await googlePlaceDetailsNew(placeId);
    if (googleNew) return googleNew;

    const google = await googlePlaceDetails(placeId);
    if (google) return google;
  }

  if (description?.trim()) {
    const matches = await osmAutocomplete(description.trim()).catch(() => []);
    const match = matches[0];
    if (match) {
      return {
        formatted: match.description || description,
        placeId: match.placeId || placeId,
        lat: match.lat ?? lat,
        lng: match.lng ?? lng,
      };
    }
  }

  return {
    formatted: description ?? "",
    placeId,
    lat,
    lng,
  };
}

async function googleReverseGeocode(
  lat: number,
  lng: number,
): Promise<AddressValue | null> {
  if (!shouldTryGoogle()) return null;
  const key = readMapsKey();
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "en");

  let res: Response;
  try {
    res = await fetchWithTimeout(url.toString(), { headers: googleAuthHeaders() }, GOOGLE_TIMEOUT_MS);
  } catch {
    return null;
  }

  const data = (await res.json()) as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      place_id?: string;
      geometry?: { location?: { lat: number; lng: number } };
    }>;
    error_message?: string;
  };

  if (data.status === "REQUEST_DENIED") {
    disableGoogle(data.error_message ?? data.status);
    return null;
  }

  const result = data.results?.[0];
  if (data.status !== "OK" || !result?.formatted_address) {
    return null;
  }

  return {
    formatted: result.formatted_address,
    placeId: result.place_id,
    lat: result.geometry?.location?.lat ?? lat,
    lng: result.geometry?.location?.lng ?? lng,
  };
}

async function nominatimReverseGeocode(
  lat: number,
  lng: number,
): Promise<AddressValue | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const res = await fetchWithTimeout(url.toString(), { headers: OSM_HEADERS }, OSM_TIMEOUT_MS);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    display_name?: string;
    place_id?: number;
    lat?: string;
    lon?: string;
  };

  if (!data.display_name) return null;

  return {
    formatted: data.display_name,
    placeId: data.place_id ? `nominatim:${data.place_id}` : undefined,
    lat: data.lat ? Number.parseFloat(data.lat) : lat,
    lng: data.lon ? Number.parseFloat(data.lon) : lng,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<AddressValue> {
  const google = await googleReverseGeocode(lat, lng);
  if (google) return google;

  const nominatim = await nominatimReverseGeocode(lat, lng);
  if (nominatim) return nominatim;

  return {
    formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    lat,
    lng,
  };
}
