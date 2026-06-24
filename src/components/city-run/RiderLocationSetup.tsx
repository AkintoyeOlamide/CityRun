"use client";

import { useCallback, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import {
  isRiderLocationDeclined,
  markRiderLocationDeclined,
} from "@/lib/city-run/consent-preferences";
import { isGeolocationSupported } from "@/lib/city-run/rider-geolocation";
import type { RiderTrackingState } from "@/lib/city-run/use-rider-location";

type RiderLocationSetupProps = {
  consent: RiderTrackingState["consent"];
  tracking: boolean;
  sharing: boolean;
  activeDeliveryCount: number;
  lastSentAt: number | null;
  gpsAccuracy?: number | null;
  error: string | null;
  requestLocationAccess: () => Promise<boolean>;
};

export function RiderLocationSetup({
  consent,
  tracking,
  sharing,
  activeDeliveryCount,
  lastSentAt,
  gpsAccuracy,
  error,
  requestLocationAccess,
}: RiderLocationSetupProps) {
  const [dismissed, setDismissed] = useState(() => isRiderLocationDeclined());
  const [enabling, setEnabling] = useState(false);

  const dismiss = useCallback(() => {
    setDismissed(true);
    markRiderLocationDeclined();
  }, []);

  const handleEnable = useCallback(async () => {
    setEnabling(true);
    try {
      const ok = await requestLocationAccess();
      if (ok) setDismissed(true);
    } finally {
      setEnabling(false);
    }
  }, [requestLocationAccess]);

  if (!isGeolocationSupported()) return null;
  if (consent === "granted") {
    return (
      <LocationStatusCard
        consent={consent}
        tracking={tracking}
        sharing={sharing}
        activeDeliveryCount={activeDeliveryCount}
        lastSentAt={lastSentAt}
        gpsAccuracy={gpsAccuracy}
        error={error}
        enabling={enabling}
        onEnable={() => void handleEnable()}
      />
    );
  }

  const needsPrompt = !dismissed && consent !== "denied";

  if (!needsPrompt && consent !== "denied" && !error) return null;

  if (needsPrompt) {
    return (
      <div className="cr-glass-card cr-glow-ring mb-4 rounded-2xl border border-emerald-400/25 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <LocateFixed className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="cr-text-label font-semibold">Enable live location</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleEnable()}
                disabled={enabling}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <MapPin className="h-4 w-4" />
                {enabling ? "Enabling…" : "Allow location tracking"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-3 py-2 text-sm text-white/55"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1 text-white/45"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <LocationStatusCard
      consent={consent}
      tracking={tracking}
      sharing={sharing}
      activeDeliveryCount={activeDeliveryCount}
      lastSentAt={lastSentAt}
      gpsAccuracy={gpsAccuracy}
      error={error}
      enabling={enabling}
      onEnable={() => void handleEnable()}
    />
  );
}

function LocationStatusCard({
  consent,
  tracking,
  sharing,
  activeDeliveryCount,
  lastSentAt,
  gpsAccuracy,
  error,
  enabling,
  onEnable,
}: {
  consent: RiderTrackingState["consent"];
  tracking: boolean;
  sharing: boolean;
  activeDeliveryCount: number;
  lastSentAt: number | null;
  gpsAccuracy?: number | null;
  error: string | null;
  enabling: boolean;
  onEnable: () => void;
}) {
  if (consent !== "granted" && consent !== "denied" && !error) return null;

  return (
    <div
      className={`cr-glass-card cr-glow-ring mb-4 rounded-2xl border px-4 py-3 ${
        consent === "denied"
          ? "border-red-400/25"
          : "border-emerald-400/25"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
            tracking && consent === "granted"
              ? "animate-pulse bg-emerald-300"
              : "bg-red-300"
          }`}
        />
        <div className="min-w-0 flex-1">
          {consent === "granted" ? (
            <>
              <p className="cr-text-label text-sm font-semibold">
                {sharing
                  ? activeDeliveryCount > 0
                    ? "Sharing live location with customers"
                    : "Sharing live location with dispatch"
                  : tracking
                    ? "Live GPS active on this phone"
                    : "Location enabled"}
              </p>
              <p className="cr-text-body mt-1 text-xs">
                {activeDeliveryCount > 0
                  ? `${activeDeliveryCount} active delivery${activeDeliveryCount === 1 ? "" : "ies"} — keep this app open for the best tracking.`
                  : "You are visible on the admin live map while location is on."}
                {lastSentAt
                  ? ` Last update ${new Date(lastSentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
                  : ""}
                {typeof gpsAccuracy === "number" && gpsAccuracy <= 90
                  ? ` GPS ±${Math.round(gpsAccuracy)} m.`
                  : typeof gpsAccuracy === "number"
                    ? " Move outdoors for a stronger GPS signal."
                    : ""}
              </p>
            </>
          ) : (
            <>
              <p className="cr-text-label text-sm font-semibold text-red-200">
                Location access blocked
              </p>
              <p className="cr-text-body mt-1 text-xs">
                Turn on location for this site in your browser settings, then tap
                enable again.
              </p>
              <button
                type="button"
                onClick={onEnable}
                disabled={enabling}
                className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#070d1a] disabled:opacity-60"
              >
                {enabling ? "Checking…" : "Enable location again"}
              </button>
            </>
          )}
          {error && <p className="cr-text-muted mt-2 text-xs">{error}</p>}
        </div>
      </div>
    </div>
  );
}
