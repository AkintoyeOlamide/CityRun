"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type { AddressValue } from "@/lib/city-run/types";
import {
  geolocationErrorMessage,
  resolveAddressFromCurrentLocation,
} from "@/lib/city-run/use-current-location-address";
import {
  hasGoogleMaps,
  lagosLocationBias,
  loadGooglePlacesScript,
} from "@/lib/city-run/google-maps";
import { isGeolocationSupported } from "@/lib/city-run/rider-geolocation";

type AddressAutocompleteProps = {
  id: string;
  label: string;
  placeholder: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  /** Auto-fill from GPS + Google reverse geocode when the field mounts */
  autoDetectOnMount?: boolean;
  /** After auto-detect, show the address read-only until the user taps Change */
  lockUntilChange?: boolean;
  /** Show a pin button to fill this field from the user's GPS + Google Maps */
  showCurrentLocation?: boolean;
  /** Tighter label and input for auth and compact forms */
  compact?: boolean;
};

type Prediction = {
  description: string;
  placeId: string;
  lat?: number;
  lng?: number;
};

type Provider = "loading" | "google" | "server";

type GoogleMapsWindow = Window & {
  google?: {
    maps: {
      places: {
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
      };
      event: { clearInstanceListeners: (instance: object) => void };
    };
  };
};

export function AddressAutocomplete({
  id,
  label,
  placeholder,
  value,
  onChange,
  autoDetectOnMount = false,
  lockUntilChange = false,
  showCurrentLocation = false,
  compact = false,
}: AddressAutocompleteProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const autoDetectAttemptedRef = useRef(false);

  const [query, setQuery] = useState(value.formatted);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [editMode, setEditMode] = useState(!lockUntilChange);
  const [provider, setProvider] = useState<Provider>("server");

  onChangeRef.current = onChange;

  useEffect(() => {
    setQuery(value.formatted);
  }, [value.formatted]);

  useEffect(() => {
    if (!autoDetectOnMount || !isGeolocationSupported()) {
      if (lockUntilChange && !value.formatted.trim()) setEditMode(true);
      return;
    }
    if (autoDetectAttemptedRef.current) return;

    if (value.formatted.trim().length > 5) {
      autoDetectAttemptedRef.current = true;
      if (lockUntilChange) setEditMode(false);
      return;
    }

    autoDetectAttemptedRef.current = true;
    let cancelled = false;
    setLocating(true);
    setLocationError("");

    void resolveAddressFromCurrentLocation()
      .then((address) => {
        if (cancelled) return;
        setQuery(address.formatted);
        onChangeRef.current(address);
        if (lockUntilChange) setEditMode(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLocationError(geolocationErrorMessage(error));
        setEditMode(true);
      })
      .finally(() => {
        if (!cancelled) setLocating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [autoDetectOnMount, lockUntilChange, value.formatted]);

  const placesRequestedRef = useRef(false);

  const requestPlaces = useCallback(() => {
    if (!hasGoogleMaps || placesRequestedRef.current) return;
    placesRequestedRef.current = true;
    setProvider("loading");
    loadGooglePlacesScript()
      .then(() => setProvider("google"))
      .catch(() => setProvider("server"));
  }, []);

  useEffect(() => {
    if (!hasGoogleMaps) {
      setProvider("server");
    }
  }, []);

  useEffect(() => {
    function onAuthFailure() {
      setProvider("server");
    }

    window.addEventListener("cityrun:maps-auth-failure", onAuthFailure);
    return () => window.removeEventListener("cityrun:maps-auth-failure", onAuthFailure);
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    const win = window as GoogleMapsWindow;
    if (provider !== "google" || !input || !win.google?.maps?.places) return;

    const autocomplete = new win.google.maps.places.Autocomplete(input, {
      fields: ["formatted_address", "geometry", "place_id"],
      componentRestrictions: { country: "ng" },
      bounds: {
        north: lagosLocationBias.lat + 0.35,
        south: lagosLocationBias.lat - 0.35,
        east: lagosLocationBias.lng + 0.35,
        west: lagosLocationBias.lng - 0.35,
      },
      strictBounds: false,
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.formatted_address) return;
      setQuery(place.formatted_address);
      onChangeRef.current({
        formatted: place.formatted_address,
        placeId: place.place_id,
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
      });
    });

    return () => {
      win.google?.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [provider, id]);

  useEffect(() => {
    if (provider !== "server") return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [provider]);

  useEffect(() => {
    if (provider !== "server") return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setPredictions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const res = await fetch(
          `/api/cityrun/places/autocomplete?input=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok) throw new Error("Autocomplete failed");
        const body = (await res.json()) as {
          predictions?: Prediction[];
          source?: string;
        };
        if (requestId !== requestIdRef.current) return;
        setPredictions(body.predictions ?? []);
        setOpen((body.predictions?.length ?? 0) > 0);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setPredictions([]);
        setOpen(false);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [provider, query]);

  async function selectPrediction(prediction: Prediction) {
    setOpen(false);
    setPredictions([]);
    setQuery(prediction.description);
    setLoading(true);

    try {
      const params = new URLSearchParams({
        placeId: prediction.placeId,
        description: prediction.description,
      });
      if (prediction.lat != null) params.set("lat", String(prediction.lat));
      if (prediction.lng != null) params.set("lng", String(prediction.lng));

      const res = await fetch(`/api/cityrun/places/details?${params.toString()}`);
      if (res.ok) {
        onChange(await res.json());
      } else {
        onChange({
          formatted: prediction.description,
          placeId: prediction.placeId,
          lat: prediction.lat,
          lng: prediction.lng,
        });
      }
    } catch {
      onChange({
        formatted: prediction.description,
        placeId: prediction.placeId,
        lat: prediction.lat,
        lng: prediction.lng,
      });
    } finally {
      setLoading(false);
    }
  }

  const handleUseCurrentLocation = useCallback(async () => {
    setLocationError("");
    setLocating(true);
    try {
      const address = await resolveAddressFromCurrentLocation();
      setQuery(address.formatted);
      onChangeRef.current(address);
      if (lockUntilChange) setEditMode(false);
    } catch (error) {
      setLocationError(geolocationErrorMessage(error));
    } finally {
      setLocating(false);
    }
  }, [lockUntilChange]);

  const canUseCurrentLocation =
    showCurrentLocation && isGeolocationSupported() && editMode;

  const showLockedView =
    lockUntilChange && !editMode && (locating || value.formatted.trim().length > 0);

  if (showLockedView) {
    return (
      <div ref={rootRef} className="relative">
        <label
          htmlFor={id}
          className={
            compact
              ? "mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40"
              : "mb-2 block text-sm font-medium text-white/80"
          }
        >
          {label}
        </label>
        <div className="rounded-xl border border-accent/25 bg-accent/10 px-4 py-3.5">
          {locating ? (
            <p className="text-sm text-white/55">Getting your location…</p>
          ) : (
            <p className="text-sm leading-relaxed text-white/90">{value.formatted}</p>
          )}
        </div>
        {!locating && (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="mt-2 text-sm font-semibold text-accent transition-colors hover:text-accent-light"
          >
            Change address
          </button>
        )}
        {locationError && (
          <p className="mt-2 text-xs text-amber-300/90">{locationError}</p>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <label
        htmlFor={id}
        className={
          compact
            ? "mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40"
            : "mb-2 block text-sm font-medium text-white/80"
        }
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={id}
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => {
            requestPlaces();
            if (provider === "server" && predictions.length > 0) {
              setOpen(true);
            } else if (provider !== "server") {
              setOpen(true);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setLocationError("");
            onChangeRef.current({
              formatted: event.target.value,
              placeId: undefined,
              lat: undefined,
              lng: undefined,
            });
          }}
          className={
            compact
              ? `w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-accent/60 focus:bg-white/[0.05] ${
                  canUseCurrentLocation ? "pl-3 pr-10" : "px-3"
                }`
              : `w-full rounded-xl border border-white/10 bg-cr-surface py-3.5 text-base text-white placeholder:text-white/35 outline-none focus:border-accent ${
                  canUseCurrentLocation ? "pl-4 pr-12" : "px-4"
                }`
          }
          autoComplete="off"
        />

        {canUseCurrentLocation && (
          <button
            type="button"
            onClick={() => void handleUseCurrentLocation()}
            disabled={locating}
            title="Use my current location"
            aria-label="Use my current location from Google Maps"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
          >
            <LocateFixed
              className={`h-5 w-5 ${locating ? "animate-pulse" : ""}`}
              strokeWidth={2.25}
            />
          </button>
        )}
      </div>

      {(canUseCurrentLocation || (autoDetectOnMount && editMode && isGeolocationSupported())) && (
        <button
          type="button"
          onClick={() => void handleUseCurrentLocation()}
          disabled={locating}
          className="mt-2 text-sm font-semibold text-accent transition-colors hover:text-accent-light disabled:opacity-50"
        >
          {locating ? "Getting location…" : "Use my current location"}
        </button>
      )}

      {locationError && (
        <p className="mt-2 text-xs text-amber-300/90">{locationError}</p>
      )}

      {provider === "server" && open && predictions.length > 0 && (
        <ul className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0b1424] shadow-xl">
          {predictions.map((prediction) => (
            <li key={prediction.placeId}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void selectPrediction(prediction)}
                className="block w-full px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5"
              >
                {prediction.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
