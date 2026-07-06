import {
  didMapsAuthFail,
  getGoogleMaps,
  loadGooglePlacesScript,
} from "@/lib/city-run/google-maps";
import {
  lagosMetroCenter,
  lagosMetroRestriction,
} from "@/lib/city-run/places-autocomplete-utils";
import type { AddressValue } from "@/lib/city-run/types";

export type ClientPlacePrediction = {
  description: string;
  placeId: string;
};

type PlacesLibrary = {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion?: {
    fetchAutocompleteSuggestions: (request: object) => Promise<{
      suggestions?: Array<{
        placePrediction?: PlacePredictionShape;
      }>;
    }>;
  };
  AutocompleteService?: new () => {
    getPlacePredictions: (
      request: object,
      callback: (
        results: Array<{ description: string; place_id: string }> | null,
        status: string,
      ) => void,
    ) => void;
  };
  PlacesServiceStatus?: { OK: string; ZERO_RESULTS: string };
  Place: new (options: { id: string; requestedLanguage?: string }) => PlaceInstance;
};

type PlacePredictionShape = {
  placeId?: string;
  place?: string;
  text?: { text?: string };
  structuredFormat?: {
    mainText?: { text?: string };
    secondaryText?: { text?: string };
  };
};

type PlaceInstance = {
  id?: string;
  formattedAddress?: string;
  location?: { lat: () => number; lng: () => number } | { lat: number; lng: number };
  fetchFields: (options: { fields: string[] }) => Promise<void>;
};

type GoogleMapsWindow = Window & {
  google?: {
    maps?: {
      importLibrary?: (name: string) => Promise<PlacesLibrary>;
      LatLng?: new (lat: number, lng: number) => object;
    };
  };
};

let autocompleteSessionToken: object | null = null;

function formatPredictionDescription(prediction: PlacePredictionShape): string {
  if (prediction.text?.text?.trim()) return prediction.text.text.trim();

  const main = prediction.structuredFormat?.mainText?.text?.trim() ?? "";
  const secondary = prediction.structuredFormat?.secondaryText?.text?.trim() ?? "";
  if (main && secondary) return `${main}, ${secondary}`;
  return main || secondary;
}

function normalizePlaceId(prediction: PlacePredictionShape): string {
  return (
    prediction.placeId?.trim() ||
    prediction.place?.replace(/^places\//, "").trim() ||
    ""
  );
}

function buildAutocompleteRequest(input: string, sessionToken: object) {
  return {
    input,
    sessionToken,
    language: "en",
    region: "ng",
    locationRestriction: lagosMetroRestriction,
    origin: {
      lat: lagosMetroCenter.lat,
      lng: lagosMetroCenter.lng,
    },
  };
}

async function loadPlacesLibrary(): Promise<PlacesLibrary | null> {
  if (typeof window === "undefined" || didMapsAuthFail()) return null;

  try {
    await loadGooglePlacesScript();
    const win = window as GoogleMapsWindow;
    if (!win.google?.maps?.importLibrary) return null;
    return (await win.google.maps.importLibrary("places")) as PlacesLibrary;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CityRun] Google Places library failed to load:", error);
    }
    return null;
  }
}

function nextSessionToken(places: PlacesLibrary): object {
  autocompleteSessionToken = new places.AutocompleteSessionToken();
  return autocompleteSessionToken;
}

export function resetPlacesAutocompleteSession() {
  autocompleteSessionToken = null;
}

async function fetchNewPlacePredictions(
  places: PlacesLibrary,
  input: string,
): Promise<ClientPlacePrediction[]> {
  if (!places.AutocompleteSuggestion) return [];

  const token = autocompleteSessionToken ?? nextSessionToken(places);
  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
    buildAutocompleteRequest(input, token),
  );

  const seen = new Set<string>();
  const predictions: ClientPlacePrediction[] = [];

  for (const suggestion of suggestions ?? []) {
    const prediction = suggestion.placePrediction;
    if (!prediction) continue;

    const placeId = normalizePlaceId(prediction);
    if (!placeId || seen.has(placeId)) continue;

    const description = formatPredictionDescription(prediction);
    if (!description) continue;

    seen.add(placeId);
    predictions.push({ description, placeId });
  }

  return predictions;
}

async function fetchLegacyPlacePredictions(
  places: PlacesLibrary,
  input: string,
): Promise<ClientPlacePrediction[]> {
  if (!places.AutocompleteService || !places.PlacesServiceStatus) return [];

  const maps = getGoogleMaps();
  const win = window as GoogleMapsWindow;
  const LatLng = win.google?.maps?.LatLng ?? maps?.LatLng;
  if (!LatLng) return [];

  const center = new LatLng(lagosMetroCenter.lat, lagosMetroCenter.lng);
  const service = new places.AutocompleteService();

  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "ng" },
        location: center,
        radius: 50_000,
        strictBounds: false,
      },
      (results, status) => {
        if (
          status !== places.PlacesServiceStatus!.OK ||
          !results ||
          results.length === 0
        ) {
          resolve([]);
          return;
        }

        resolve(
          results.map((result) => ({
            description: result.description,
            placeId: result.place_id,
          })),
        );
      },
    );
  });
}

export async function fetchClientPlacePredictions(
  input: string,
): Promise<ClientPlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 3) return [];

  const places = await loadPlacesLibrary();
  if (!places) return [];

  try {
    const modern = await fetchNewPlacePredictions(places, trimmed);
    if (modern.length > 0) return modern;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CityRun] Google Places (New) autocomplete failed:", error);
    }
  }

  try {
    return await fetchLegacyPlacePredictions(places, trimmed);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CityRun] Google Places (legacy) autocomplete failed:", error);
    }
    return [];
  }
}

export async function resolveClientPlaceDetails(
  placeId: string,
): Promise<AddressValue | null> {
  const places = await loadPlacesLibrary();
  if (!places?.Place) return null;

  try {
    const place = new places.Place({ id: placeId, requestedLanguage: "en" });
    await place.fetchFields({ fields: ["formattedAddress", "location", "id"] });

    const formatted = place.formattedAddress?.trim();
    if (!formatted) return null;

    const location = place.location;
    const lat =
      typeof location?.lat === "function"
        ? location.lat()
        : typeof location?.lat === "number"
          ? location.lat
          : undefined;
    const lng =
      typeof location?.lng === "function"
        ? location.lng()
        : typeof location?.lng === "number"
          ? location.lng
          : undefined;

    resetPlacesAutocompleteSession();

    return {
      formatted,
      placeId: place.id ?? placeId,
      lat,
      lng,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CityRun] Google place details failed:", error);
    }
    return null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("cityrun:maps-auth-failure", () => {
    autocompleteSessionToken = null;
  });
}
