"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type { AddressValue } from "@/lib/city-run/types";
import {
  geolocationErrorMessage,
  resolveAddressFromCurrentLocation,
  warmCurrentLocationLookup,
} from "@/lib/city-run/use-current-location-address";
import {
  fetchClientPlacePredictions,
  resolveClientPlaceDetails,
} from "@/lib/city-run/places-client";
import { loadGooglePlacesScript } from "@/lib/city-run/google-maps";
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

async function fetchServerPredictions(input: string): Promise<Prediction[]> {
  const res = await fetch(
    `/api/cityrun/places/autocomplete?input=${encodeURIComponent(input)}`,
  );
  if (!res.ok) throw new Error("Autocomplete failed");
  const body = (await res.json()) as {
    predictions?: Prediction[];
    source?: "google" | "nominatim" | "none";
  };
  return body.predictions ?? [];
}

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
  const googleReadyRef = useRef(false);

  const [query, setQuery] = useState(value.formatted);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [editMode, setEditMode] = useState(!lockUntilChange);
  const [mounted, setMounted] = useState(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setQuery(value.formatted);
  }, [value.formatted]);

  useEffect(() => {
    let cancelled = false;

    if (autoDetectOnMount) {
      warmCurrentLocationLookup();
    }

    loadGooglePlacesScript()
      .then(() => {
        if (!cancelled) googleReadyRef.current = true;
      })
      .catch(() => {
        googleReadyRef.current = false;
      });

    function onMapsAuthFailure() {
      googleReadyRef.current = false;
    }
    window.addEventListener("cityrun:maps-auth-failure", onMapsAuthFailure);

    return () => {
      cancelled = true;
      window.removeEventListener("cityrun:maps-auth-failure", onMapsAuthFailure);
    };
  }, []);

  useEffect(() => {
    if (!mounted || !autoDetectOnMount || !isGeolocationSupported()) {
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
  }, [mounted, autoDetectOnMount, lockUntilChange, value.formatted]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setPredictions([]);
      setOpen(false);
      setSearching(false);
      setSearched(false);
      return;
    }

    setSearching(true);
    setSearched(false);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;

      try {
        if (!googleReadyRef.current) {
          try {
            await loadGooglePlacesScript();
            googleReadyRef.current = true;
          } catch {
            googleReadyRef.current = false;
          }
        }

        let next: Prediction[] = [];

        if (googleReadyRef.current) {
          next = await fetchClientPlacePredictions(trimmed).catch(
            () => [] as Prediction[],
          );
        }

        if (next.length === 0) {
          next = await fetchServerPredictions(trimmed).catch(() => [] as Prediction[]);
        }

        if (requestId !== requestIdRef.current) return;
        setPredictions(next);
        setOpen(true);
        setSearched(true);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setPredictions([]);
        setOpen(true);
        setSearched(true);
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function selectPrediction(prediction: Prediction) {
    setOpen(false);
    setPredictions([]);
    setSearched(false);
    setQuery(prediction.description);
    setSearching(true);

    try {
      if (!prediction.placeId.startsWith("nominatim:")) {
        try {
          const googleAddress = await resolveClientPlaceDetails(prediction.placeId);
          if (googleAddress) {
            onChange(googleAddress);
            return;
          }
        } catch {
          /* fall through to server / description fallback */
        }
      }

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
      setSearching(false);
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

  const geolocationAvailable = mounted && isGeolocationSupported();

  const canUseCurrentLocation =
    showCurrentLocation && geolocationAvailable && editMode;

  const showLockedView =
    mounted &&
    lockUntilChange &&
    !editMode &&
    (locating || value.formatted.trim().length > 0);

  const showDropdown = open && query.trim().length >= 3;

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
            <div>
              <p className="text-sm text-white/55">Getting your location…</p>
              <button
                type="button"
                onClick={() => {
                  setLocating(false);
                  setEditMode(true);
                }}
                className="mt-2 text-sm font-semibold text-accent transition-colors hover:text-accent-light"
              >
                Enter address manually
              </button>
            </div>
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
            if (query.trim().length >= 3 && (predictions.length > 0 || searched)) {
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
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? `${id}-suggestions` : undefined}
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

      {(canUseCurrentLocation ||
        (autoDetectOnMount && editMode && geolocationAvailable)) && (
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

      {showDropdown && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-[99999] mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0b1424] shadow-xl"
        >
          {searching && (
            <li className="px-4 py-3 text-sm text-white/45">Searching addresses…</li>
          )}
          {!searching && predictions.length === 0 && searched && (
            <li className="px-4 py-3 text-sm text-white/45">
              No addresses found — try a street name or landmark
            </li>
          )}
          {!searching &&
            predictions.map((prediction) => (
              <li key={prediction.placeId} role="option">
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
