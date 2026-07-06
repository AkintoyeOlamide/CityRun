import type { AddressValue } from "@/lib/city-run/types";

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
  lat: 6.5244,
  lng: 3.3792,
  radiusMeters: 45_000,
};

function readServerMapsKey(): string {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() || "";
}

/** Browser-restricted keys cannot be used from the server — skip them. */
function readMapsKey() {
  return readServerMapsKey();
}

async function googleAutocompleteNew(input: string): Promise<PlacePrediction[] | null> {
  const key = readServerMapsKey();
  if (!key) return null;

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["NG"],
      languageCode: "en",
      locationBias: {
        circle: {
          center: { latitude: lagosLocationBias.lat, longitude: lagosLocationBias.lng },
          radius: lagosLocationBias.radiusMeters,
        },
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
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

async function googleAutocompleteLegacy(input: string): Promise<PlacePrediction[] | null> {
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

  const res = await fetch(url.toString(), { cache: "no-store" });
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

  return null;
}

async function googlePlaceDetails(placeId: string): Promise<AddressValue | null> {
  const key = readMapsKey();
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", key);
  url.searchParams.set("fields", "formatted_address,geometry,place_id");

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as {
    status?: string;
    result?: {
      formatted_address?: string;
      place_id?: string;
      geometry?: { location?: { lat: number; lng: number } };
    };
  };

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

async function nominatimSearch(query: string): Promise<PlacePrediction[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ng");
  url.searchParams.set("limit", "6");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "CityRun/1.0 (citygateshl.org; info@citygateshl.com)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

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

async function nominatimAutocomplete(input: string): Promise<PlacePrediction[]> {
  const queries = [input];
  if (!/\blagos\b/i.test(input)) {
    queries.push(`${input}, Lagos, Nigeria`);
  }

  for (const query of queries) {
    const results = await nominatimSearch(query);
    if (results.length > 0) return results;
  }

  return [];
}

export async function autocompletePlaces(input: string): Promise<AutocompleteResult> {
  const trimmed = input.trim();
  if (trimmed.length < 3) {
    return { predictions: [], source: "none" };
  }

  const googleNew = await googleAutocompleteNew(trimmed);
  if (googleNew !== null && googleNew.length > 0) {
    return { predictions: googleNew, source: "google" };
  }

  const googleLegacy = await googleAutocompleteLegacy(trimmed);
  if (googleLegacy !== null && googleLegacy.length > 0) {
    return { predictions: googleLegacy, source: "google" };
  }

  const nominatim = await nominatimAutocomplete(trimmed);
  if (nominatim.length > 0) {
    return { predictions: nominatim, source: "nominatim" };
  }

  return { predictions: [], source: "none" };
}

export async function resolvePlace(
  placeId: string,
  description?: string,
  lat?: number,
  lng?: number,
): Promise<AddressValue> {
  if (placeId.startsWith("nominatim:")) {
    return {
      formatted: description ?? "",
      placeId,
      lat,
      lng,
    };
  }

  const google = await googlePlaceDetails(placeId);
  if (google) return google;

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
  const key = readMapsKey();
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "en");

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      place_id?: string;
      geometry?: { location?: { lat: number; lng: number } };
    }>;
  };

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

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "CityRun/1.0 (citygateshl.org; info@citygateshl.com)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

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
