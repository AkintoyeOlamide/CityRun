import {
  didMapsAuthFail,
  lagosLocationBias,
  loadGooglePlacesScript,
} from "@/lib/city-run/google-maps";
import type { AddressValue } from "@/lib/city-run/types";

export type ClientPlacePrediction = {
  description: string;
  placeId: string;
};

type PlacesLibrary = {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: object) => Promise<{
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          place?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
          toPlace?: () => PlaceInstance;
        };
      }>;
    }>;
  };
  Place: new (options: { id: string; requestedLanguage?: string }) => PlaceInstance;
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
    };
  };
};

let autocompleteSessionToken: object | null = null;

function formatPredictionDescription(prediction: {
  text?: { text?: string };
  structuredFormat?: {
    mainText?: { text?: string };
    secondaryText?: { text?: string };
  };
}): string {
  if (prediction.text?.text?.trim()) return prediction.text.text.trim();

  const main = prediction.structuredFormat?.mainText?.text?.trim() ?? "";
  const secondary = prediction.structuredFormat?.secondaryText?.text?.trim() ?? "";
  if (main && secondary) return `${main}, ${secondary}`;
  return main || secondary;
}

function normalizePlaceId(prediction: {
  placeId?: string;
  place?: string;
}): string {
  return (
    prediction.placeId?.trim() ||
    prediction.place?.replace(/^places\//, "").trim() ||
    ""
  );
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

export async function fetchClientPlacePredictions(
  input: string,
): Promise<ClientPlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 3) return [];

  const places = await loadPlacesLibrary();
  if (!places?.AutocompleteSuggestion) return [];

  const token = autocompleteSessionToken ?? nextSessionToken(places);

  try {
    const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
      sessionToken: token,
      includedRegionCodes: ["NG"],
      language: "en",
      locationBias: {
        circle: {
          center: {
            latitude: lagosLocationBias.lat,
            longitude: lagosLocationBias.lng,
          },
          radius: lagosLocationBias.radiusMeters,
        },
      },
    });

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
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CityRun] Google autocomplete failed:", error);
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
